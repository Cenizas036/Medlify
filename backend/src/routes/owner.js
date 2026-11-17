'use strict';
const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requirePharmacist } = require('./auth');
const router = express.Router();
router.use(requireAuth, requirePharmacist);

const CATS = ['pain-relief', 'diabetes-care', 'allergy-care', 'digestive-health', 'vitamins-supplements', 'first-aid'];
const FORMS = ['tablet', 'capsule', 'syrup', 'cream', 'injection', 'sachet'];
const fail = (res, e) => { console.error(e); res.status(500).json({ error: 'Internal server error.' }); };

async function mine(req, res, next) {
  try {
    const r = await pool.query('SELECT id, name, address, phone, open_hours, drug_licence_no FROM pharmacies WHERE owner_user_id=$1', [req.userId]);
    if (!r.rowCount) return res.status(404).json({ error: 'You have not claimed a pharmacy yet.' });
    req.ph = r.rows[0]; next();
  } catch (e) { fail(res, e); }
}

function stock(b) {
  const quantity = Number(b.quantity), price = Number(b.price);
  if (b.quantity === '' || b.quantity == null || !Number.isInteger(quantity) || quantity < 0 || quantity > 100000) return { error: 'Quantity must be a whole number from 0 to 100000.' };
  if (!(price > 0) || price > 100000) return { error: 'Price must be above 0 and at most 100000.' };
  return { quantity, price: Math.round(price * 100) / 100 };
}

router.get('/unclaimed', async (req, res) => {
  const q = String(req.query.q || '').trim();
  try {
    const r = await pool.query(
      `SELECT id, name, address FROM pharmacies WHERE owner_user_id IS NULL
         AND ($1 = '' OR name ILIKE '%' || $1 || '%' OR address ILIKE '%' || $1 || '%') ORDER BY name LIMIT 30`, [q]);
    res.json(r.rows);
  } catch (e) { fail(res, e); }
});

router.post('/claim', async (req, res) => {
  const id = parseInt(req.body.pharmacy_id, 10);
  const licence = String(req.body.licence_no || '').trim().toUpperCase();
  if (isNaN(id)) return res.status(400).json({ error: 'Choose a pharmacy.' });
  if (!/^[A-Z0-9\/\- ]{5,30}$/.test(licence)) return res.status(400).json({ error: 'Enter your drug licence number (5 to 30 letters, digits, / or -).' });
  try {
    if ((await pool.query('SELECT 1 FROM pharmacies WHERE owner_user_id=$1', [req.userId])).rowCount)
      return res.status(409).json({ error: 'You already manage a pharmacy.' });
    const r = await pool.query('UPDATE pharmacies SET owner_user_id=$1, drug_licence_no=$3 WHERE id=$2 AND owner_user_id IS NULL RETURNING id', [req.userId, id, licence]);
    if (!r.rowCount) return res.status(409).json({ error: 'This pharmacy is already claimed or does not exist.' });
    res.json({ ok: true });
  } catch (e) { fail(res, e); }
});

// ── Demo simulation ──────────────────────────────────────────────────────
// Nothing runs in the background (the free server sleeps), so the simulation catches up
// whenever the pharmacist's dashboard asks for data:
//   * supplier orders are delivered SUPPLIER_DELAY_S seconds after being placed
//   * sample customers place a new order roughly every SIM_INTERVAL_S seconds
const SUPPLIER_DELAY_S = 40;
const SIM_INTERVAL_S = 60;
const LOW_STOCK = 10;
const SUPPLIERS = ['Kalinga Pharma Distributors', 'Odisha Medical Agencies', 'Utkal Drug House', 'Eastern Healthcare Wholesale'];
const SAMPLE_CUSTOMERS = [
  ['Ananya Mishra', 'Plot 112, Saheed Nagar, Bhubaneswar'], ['Rohit Das', 'A-34, Nayapalli, Bhubaneswar'],
  ['Priyanka Sahoo', '57 Jaydev Vihar, Bhubaneswar'], ['Subham Patnaik', 'HIG-21, Chandrasekharpur, Bhubaneswar'],
  ['Sneha Mohanty', 'Flat 3B, Patia Square, Bhubaneswar'], ['Aditya Behera', '14 Old Town, Lingaraj Road, Bhubaneswar'],
  ['Ipsita Panda', '220 Khandagiri Vihar, Bhubaneswar'], ['Manas Rath', 'Qr. 6, Unit 9, Bhubaneswar'],
  ['Lipsa Nayak', '9 Satya Vihar, Rasulgarh, Bhubaneswar'], ['Debasish Swain', 'D-81, Sailashree Vihar, Bhubaneswar'],
];
const pick = a => a[Math.floor(Math.random() * a.length)];
const rint = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

async function deliverSupplierOrders(phId) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const due = await c.query(
      `UPDATE supplier_orders SET status='delivered', delivered_at=now()
       WHERE pharmacy_id=$1 AND status='ordered' AND created_at < now() - make_interval(secs => $2)
       RETURNING medicine_id, quantity`, [phId, SUPPLIER_DELAY_S]);
    for (const d of due.rows)
      await c.query('UPDATE inventory SET quantity = quantity + $1 WHERE pharmacy_id=$2 AND medicine_id=$3', [d.quantity, phId, d.medicine_id]);
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
  finally { c.release(); }
}

// Places one sample order with 1–3 in-stock medicines, taking the stock like a real order
async function placeSampleOrder(c, phId, createdAt, status) {
  const inv = (await c.query('SELECT medicine_id, quantity, price FROM inventory WHERE pharmacy_id=$1 AND quantity > 0', [phId])).rows;
  if (!inv.length) return;
  const items = inv.sort(() => Math.random() - 0.5).slice(0, rint(1, 3))
    .map(i => ({ id: i.medicine_id, qty: Math.min(i.quantity, rint(1, 3)), price: Number(i.price) }));
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const [name, addr] = pick(SAMPLE_CUSTOMERS);
  const o = await c.query(
    `INSERT INTO orders (pharmacy_id, status, delivery_address, total, customer_name, customer_phone, is_sample, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7) RETURNING id`,
    [phId, status, addr, total.toFixed(2), name, '9' + String(rint(100000000, 999999999)), createdAt]);
  for (const i of items) {
    await c.query('INSERT INTO order_items (order_id, medicine_id, quantity, price) VALUES ($1,$2,$3,$4)', [o.rows[0].id, i.id, i.qty, i.price]);
    if (status !== 'cancelled') await c.query('UPDATE inventory SET quantity = quantity - $1 WHERE pharmacy_id=$2 AND medicine_id=$3', [i.qty, phId, i.id]);
  }
}

async function simulateCustomers(phId) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    // Row lock: two dashboard tabs polling at once can't both generate the same orders
    const last = (await c.query('SELECT last_sim_at FROM pharmacies WHERE id=$1 FOR UPDATE', [phId])).rows[0]?.last_sim_at;
    if (!last) {
      // First visit: a short history from the last few hours, so the dashboard isn't empty
      const history = ['delivered', 'delivered', 'delivered', 'cancelled', 'out_for_delivery', 'accepted', 'placed', 'placed'];
      for (let k = 0; k < history.length; k++)
        await placeSampleOrder(c, phId, new Date(Date.now() - (history.length - k) * 22 * 60000), history[k]);
      await c.query('UPDATE pharmacies SET last_sim_at=now() WHERE id=$1', [phId]);
    } else {
      const n = Math.min(3, Math.floor((Date.now() - new Date(last).getTime()) / (SIM_INTERVAL_S * 1000)));
      for (let k = 0; k < n; k++) await placeSampleOrder(c, phId, new Date(Date.now() - (n - 1 - k) * 5000), 'placed');
      if (n > 0) await c.query('UPDATE pharmacies SET last_sim_at=now() WHERE id=$1', [phId]);
    }
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
  finally { c.release(); }
}

router.get('/pharmacy', mine, async (req, res) => {
  try {
    await deliverSupplierOrders(req.ph.id);
    const r = await pool.query(
      `SELECT i.medicine_id, m.name, m.generic_name, m.requires_prescription, m.category, m.form, i.quantity, i.price,
              (SELECT json_build_object('id', s.id, 'quantity', s.quantity, 'supplier', s.supplier, 'created_at', s.created_at)
                 FROM supplier_orders s WHERE s.pharmacy_id=i.pharmacy_id AND s.medicine_id=i.medicine_id AND s.status='ordered'
                 ORDER BY s.id DESC LIMIT 1) AS pending_restock
       FROM inventory i JOIN medicines m ON m.id = i.medicine_id WHERE i.pharmacy_id = $1 ORDER BY m.name`, [req.ph.id]);
    res.json({ pharmacy: req.ph, inventory: r.rows, low_stock: LOW_STOCK, supplier_delay_s: SUPPLIER_DELAY_S });
  } catch (e) { fail(res, e); }
});

// ── Incoming customer orders ─────────────────────────────────────────────
router.get('/orders', mine, async (req, res) => {
  try {
    await simulateCustomers(req.ph.id);
    const r = await pool.query(
      `SELECT o.id, o.status, o.total, o.created_at, o.customer_name, o.customer_phone, o.delivery_address, o.is_sample,
              COALESCE(json_agg(json_build_object('name', m.name, 'quantity', oi.quantity, 'price', oi.price) ORDER BY m.name)
                       FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id LEFT JOIN medicines m ON m.id = oi.medicine_id
       WHERE o.pharmacy_id = $1 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`, [req.ph.id]);
    res.json(r.rows);
  } catch (e) { fail(res, e); }
});

const NEXT = { placed: 'accepted', accepted: 'out_for_delivery', out_for_delivery: 'delivered' };
router.post('/orders/:id/status', mine, async (req, res) => {
  const id = parseInt(req.params.id, 10), to = String(req.body.status || '');
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid order id.' });
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const o = (await c.query('SELECT status FROM orders WHERE id=$1 AND pharmacy_id=$2 FOR UPDATE', [id, req.ph.id])).rows[0];
    if (!o) { await c.query('ROLLBACK'); return res.status(404).json({ error: 'Order not found.' }); }
    const cancel = to === 'cancelled' && ['placed', 'accepted'].includes(o.status);
    if (!cancel && NEXT[o.status] !== to) { await c.query('ROLLBACK'); return res.status(409).json({ error: `Can't change an order from "${o.status.replace(/_/g, ' ')}" to "${to.replace(/_/g, ' ')}".` }); }
    if (cancel) {
      const items = await c.query('SELECT medicine_id, quantity FROM order_items WHERE order_id=$1', [id]);
      for (const i of items.rows)
        await c.query('UPDATE inventory SET quantity = quantity + $1 WHERE pharmacy_id=$2 AND medicine_id=$3', [i.quantity, req.ph.id, i.medicine_id]);
    }
    await c.query('UPDATE orders SET status=$1 WHERE id=$2', [to, id]);
    await c.query('COMMIT');
    res.json({ id, status: to });
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); fail(res, e); }
  finally { c.release(); }
});

// ── Restock from supplier ────────────────────────────────────────────────
router.post('/restock/:mid', mine, async (req, res) => {
  const mid = parseInt(req.params.mid, 10);
  const qty = req.body.quantity == null ? 50 : Number(req.body.quantity);
  if (isNaN(mid)) return res.status(400).json({ error: 'Invalid medicine id.' });
  if (!Number.isInteger(qty) || qty < 1 || qty > 1000) return res.status(400).json({ error: 'Order between 1 and 1000 units.' });
  try {
    const inv = (await pool.query('SELECT price FROM inventory WHERE pharmacy_id=$1 AND medicine_id=$2', [req.ph.id, mid])).rows[0];
    if (!inv) return res.status(404).json({ error: 'This medicine is not in your stock list.' });
    if ((await pool.query("SELECT 1 FROM supplier_orders WHERE pharmacy_id=$1 AND medicine_id=$2 AND status='ordered'", [req.ph.id, mid])).rowCount)
      return res.status(409).json({ error: 'A supplier order for this medicine is already on its way.' });
    const r = await pool.query(
      `INSERT INTO supplier_orders (pharmacy_id, medicine_id, supplier, quantity, unit_cost)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, supplier, quantity, unit_cost, status, created_at`,
      [req.ph.id, mid, SUPPLIERS[mid % SUPPLIERS.length], qty, (Number(inv.price) * 0.7).toFixed(2)]);
    res.status(201).json({ ...r.rows[0], arrives_in_s: SUPPLIER_DELAY_S });
  } catch (e) { fail(res, e); }
});

router.get('/supplier-orders', mine, async (req, res) => {
  try {
    await deliverSupplierOrders(req.ph.id);
    const r = await pool.query(
      `SELECT s.id, m.name, s.supplier, s.quantity, s.unit_cost, s.status, s.created_at, s.delivered_at
       FROM supplier_orders s JOIN medicines m ON m.id = s.medicine_id
       WHERE s.pharmacy_id=$1 ORDER BY s.created_at DESC LIMIT 50`, [req.ph.id]);
    res.json(r.rows);
  } catch (e) { fail(res, e); }
});

router.put('/inventory/:mid', mine, async (req, res) => {
  const mid = parseInt(req.params.mid, 10);
  if (isNaN(mid)) return res.status(400).json({ error: 'Invalid medicine id.' });
  const s = stock(req.body);
  if (s.error) return res.status(400).json({ error: s.error });
  try {
    const r = await pool.query(
      `INSERT INTO inventory (pharmacy_id, medicine_id, quantity, price) VALUES ($1,$2,$3,$4)
       ON CONFLICT (pharmacy_id, medicine_id) DO UPDATE SET quantity = EXCLUDED.quantity, price = EXCLUDED.price
       RETURNING medicine_id, quantity, price`, [req.ph.id, mid, s.quantity, s.price]);
    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === '23503') return res.status(404).json({ error: 'Medicine not found.' });
    fail(res, e);
  }
});

router.delete('/inventory/:mid', mine, async (req, res) => {
  const mid = parseInt(req.params.mid, 10);
  if (isNaN(mid)) return res.status(400).json({ error: 'Invalid medicine id.' });
  try { await pool.query('DELETE FROM inventory WHERE pharmacy_id=$1 AND medicine_id=$2', [req.ph.id, mid]); res.json({ ok: true }); }
  catch (e) { fail(res, e); }
});

router.post('/medicines', mine, async (req, res) => {
  const name = String(req.body.name || '').trim().replace(/\s+/g, ' ');
  const generic = String(req.body.generic_name || '').trim().slice(0, 80);
  const category = CATS.includes(req.body.category) ? req.body.category : null;
  const form = FORMS.includes(req.body.form) ? req.body.form : null;
  const rx = req.body.requires_prescription !== false;
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Medicine name must be 2 to 80 characters.' });
  const s = stock(req.body);
  if (s.error) return res.status(400).json({ error: s.error });
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    if ((await c.query('SELECT 1 FROM medicines WHERE lower(name) = lower($1)', [name])).rowCount) {
      await c.query('ROLLBACK');
      return res.status(409).json({ error: 'A medicine with this name already exists. Search for it and add it to your stock instead.' });
    }
    const m = await c.query('INSERT INTO medicines (name, generic_name, requires_prescription, category, form) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [name, generic, rx, category, form]);
    await c.query('INSERT INTO inventory (pharmacy_id, medicine_id, quantity, price) VALUES ($1,$2,$3,$4)', [req.ph.id, m.rows[0].id, s.quantity, s.price]);
    await c.query('COMMIT');
    res.status(201).json({ medicine_id: m.rows[0].id });
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); fail(res, e); }
  finally { c.release(); }
});

module.exports = router;
