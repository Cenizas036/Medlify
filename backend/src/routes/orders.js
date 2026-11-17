'use strict';
const express = require('express');
const pool    = require('../db/pool');
const { requireAuth } = require('./auth');
const router  = express.Router();

function validPhone(p) {
  return /^[6-9]\d{9}$/.test(String(p).replace(/\s/g, ''));
}

/**
 * GET /api/orders?ids=1,2,3  — fetch orders by id list (from localStorage)
 */
router.get('/', async (req, res) => {
  const idsParam = String(req.query.ids || '');
  if (!idsParam) return res.json([]);

  const ids = idsParam
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n > 0)
    .slice(0, 20);

  if (ids.length === 0) return res.json([]);

  try {
    const result = await pool.query(
      `SELECT o.id, o.status, o.total, o.created_at,
              p.name AS pharmacy_name,
              COUNT(oi.id)::int AS item_count
       FROM orders o
       JOIN pharmacies p ON p.id = o.pharmacy_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = ANY($1::int[])
       GROUP BY o.id, p.name
       ORDER BY o.created_at DESC`,
      [ids]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Orders list error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/orders/:id — full order detail
 */
router.get('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid order id.' });

  try {
    // Only the customer who placed the order, or the pharmacy that received it, may see it
    const orderQ = await pool.query(
      `SELECT o.id, o.status, o.delivery_address, o.total, o.created_at,
              o.customer_name, o.customer_phone,
              p.id AS pharmacy_id, p.name AS pharmacy_name, p.phone AS pharmacy_phone
       FROM orders o
       JOIN pharmacies p ON p.id = o.pharmacy_id
       WHERE o.id = $1 AND (o.user_id = $2 OR p.owner_user_id = $2)`,
      [id, req.userId]
    );
    if (orderQ.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });

    const itemsQ = await pool.query(
      `SELECT oi.medicine_id, m.name AS medicine_name, oi.quantity, oi.price
       FROM order_items oi
       JOIN medicines m ON m.id = oi.medicine_id
       WHERE oi.order_id = $1`,
      [id]
    );

    res.json({ ...orderQ.rows[0], items: itemsQ.rows });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/orders — place an order
 */
router.post('/', async (req, res) => {
  const { pharmacy_id, items, delivery_address, customer_name, customer_phone } = req.body;

  if (!pharmacy_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'pharmacy_id and items[] are required.' });
  }
  if (!delivery_address || String(delivery_address).trim().length < 10) {
    return res.status(400).json({ error: 'delivery_address must be at least 10 characters.' });
  }
  if (!customer_name || String(customer_name).trim().length < 2) {
    return res.status(400).json({ error: 'customer_name is required.' });
  }
  if (!customer_phone || !validPhone(customer_phone)) {
    return res.status(400).json({ error: 'customer_phone must be a valid 10-digit Indian mobile number.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const lineItems = [];

    for (const item of items) {
      const mid = parseInt(item.medicine_id, 10);
      const qty = parseInt(item.quantity, 10);
      if (isNaN(mid) || isNaN(qty) || qty < 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Invalid item: medicine_id=${item.medicine_id} quantity=${item.quantity}` });
      }

      const inv = await client.query(
        'SELECT quantity, price FROM inventory WHERE pharmacy_id=$1 AND medicine_id=$2 FOR UPDATE',
        [pharmacy_id, mid]
      );

      if (inv.rows.length === 0 || inv.rows[0].quantity < qty) {
        await client.query('ROLLBACK');
        const have = inv.rows[0]?.quantity ?? 0;
        return res.status(409).json({
          error: `Insufficient stock for medicine_id=${mid}. Requested ${qty}, available ${have}.`,
          medicine_id: mid,
          available: have,
        });
      }

      const price = Number(inv.rows[0].price);
      total += price * qty;
      lineItems.push({ medicine_id: mid, quantity: qty, price });
    }

    const orderResult = await client.query(
      `INSERT INTO orders (pharmacy_id, delivery_address, total, customer_name, customer_phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
      [pharmacy_id, delivery_address.trim(), total.toFixed(2), customer_name.trim(), customer_phone.trim()]
    );
    const orderId   = orderResult.rows[0].id;
    const createdAt = orderResult.rows[0].created_at;

    for (const li of lineItems) {
      await client.query(
        'INSERT INTO order_items (order_id, medicine_id, quantity, price) VALUES ($1,$2,$3,$4)',
        [orderId, li.medicine_id, li.quantity, li.price]
      );
      await client.query(
        'UPDATE inventory SET quantity = quantity - $1 WHERE pharmacy_id=$2 AND medicine_id=$3',
        [li.quantity, pharmacy_id, li.medicine_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      id: orderId,
      status: 'placed',
      pharmacy_id: Number(pharmacy_id),
      total: Number(total.toFixed(2)),
      created_at: createdAt,
      items: lineItems,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    client.release();
  }
});

// Order status (accepted → out for delivery → delivered) is now set by the pharmacy
// from its dashboard: see POST /api/owner/orders/:id/status.

/**
 * POST /api/orders/:id/cancel — the customer's own order, only while 'placed'; restores inventory
 */
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid order id.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const r = await client.query(
      'SELECT status, pharmacy_id FROM orders WHERE id=$1 AND user_id=$2 FOR UPDATE', [id, req.userId]
    );
    if (r.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (r.rows[0].status !== 'placed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot cancel order with status: ${r.rows[0].status}` });
    }

    const items = await client.query(
      'SELECT medicine_id, quantity FROM order_items WHERE order_id=$1', [id]
    );
    for (const item of items.rows) {
      await client.query(
        'UPDATE inventory SET quantity = quantity + $1 WHERE pharmacy_id=$2 AND medicine_id=$3',
        [item.quantity, r.rows[0].pharmacy_id, item.medicine_id]
      );
    }

    await client.query('UPDATE orders SET status=$1 WHERE id=$2', ['cancelled', id]);
    await client.query('COMMIT');
    res.json({ id, status: 'cancelled' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    client.release();
  }
});

module.exports = router;
