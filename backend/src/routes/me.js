'use strict';
const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('./auth');
const router = express.Router();
router.use(requireAuth);

router.get('/orders', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT o.id, o.status, o.total, o.created_at, p.name AS pharmacy_name,
              (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o JOIN pharmacies p ON p.id = o.pharmacy_id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`, [req.userId]);
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
});

router.get('/cabinet', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT m.id, m.name, m.generic_name, m.requires_prescription AS rx, m.form
       FROM user_cabinet c JOIN medicines m ON m.id = c.medicine_id
       WHERE c.user_id = $1 ORDER BY c.created_at DESC`, [req.userId]);
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
});

router.put('/cabinet/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid medicine id.' });
  try {
    await pool.query('INSERT INTO user_cabinet (user_id, medicine_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.userId, id]);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23503') return res.status(404).json({ error: 'Medicine not found.' });
    console.error(e); res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/cabinet/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid medicine id.' });
  try {
    await pool.query('DELETE FROM user_cabinet WHERE user_id=$1 AND medicine_id=$2', [req.userId, id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
});

router.patch('/profile', async (req, res) => {
  const address = String(req.body.address || '').trim();
  if (address.length < 10) return res.status(400).json({ error: 'Address must be at least 10 characters.' });
  if (address.length > 300) return res.status(400).json({ error: 'Address is too long.' });
  try {
    const r = await pool.query('UPDATE users SET address=$1 WHERE id=$2 RETURNING id,name,phone,role,address', [address, req.userId]);
    res.json(r.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
});

function clean(b) {
  const label = String(b.label || 'Home').trim().slice(0, 20) || 'Home';
  const name = String(b.recipient_name || '').trim();
  const phone = String(b.recipient_phone || '').replace(/\s/g, '');
  const address = String(b.address || '').trim();
  const lat = b.lat == null || b.lat === '' ? null : Number(b.lat);
  const lng = b.lng == null || b.lng === '' ? null : Number(b.lng);
  if (name.length < 2) return { error: 'Enter the recipient name.' };
  if (!/^[6-9]\d{9}$/.test(phone)) return { error: 'Enter a valid 10-digit mobile number.' };
  if (address.length < 10 || address.length > 300) return { error: 'Address must be 10 to 300 characters.' };
  if ((lat != null && !(lat >= -90 && lat <= 90)) || (lng != null && !(lng >= -180 && lng <= 180))) return { error: 'Invalid coordinates.' };
  return { v: { label, name, phone, address, lat, lng, is_self: !!b.is_self, def: !!b.is_default } };
}

async function saveAddress(req, res, id) {
  const { error, v } = clean(req.body);
  if (error) return res.status(400).json({ error });
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    if (!id) {
      const n = (await c.query('SELECT COUNT(*)::int AS n FROM addresses WHERE user_id=$1', [req.userId])).rows[0].n;
      if (n >= 10) { await c.query('ROLLBACK'); return res.status(400).json({ error: 'You can save up to 10 addresses.' }); }
      v.def = v.def || n === 0;
    }
    if (v.def) await c.query('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.userId]);
    const vals = [req.userId, v.label, v.name, v.phone, v.address, v.lat, v.lng, v.is_self, v.def];
    const r = id
      ? await c.query(`UPDATE addresses SET label=$3, recipient_name=$4, recipient_phone=$5, address=$6, lat=$7, lng=$8,
                       is_self=$9, is_default = addresses.is_default OR $10 WHERE id=$1 AND user_id=$2 RETURNING *`, [id, req.userId, ...vals.slice(1)])
      : await c.query(`INSERT INTO addresses (user_id,label,recipient_name,recipient_phone,address,lat,lng,is_self,is_default)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, vals);
    if (!r.rowCount) { await c.query('ROLLBACK'); return res.status(404).json({ error: 'Address not found.' }); }
    await c.query('COMMIT');
    res.status(id ? 200 : 201).json(r.rows[0]);
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
  finally { c.release(); }
}

router.get('/addresses', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at DESC', [req.userId]);
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
});
router.post('/addresses', (req, res) => saveAddress(req, res, null));
router.put('/addresses/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid address id.' });
  saveAddress(req, res, id);
});
router.delete('/addresses/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid address id.' });
  try {
    const r = await pool.query('DELETE FROM addresses WHERE id=$1 AND user_id=$2 RETURNING is_default', [id, req.userId]);
    if (r.rows[0]?.is_default) await pool.query(
      'UPDATE addresses SET is_default=true WHERE id = (SELECT id FROM addresses WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1)', [req.userId]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
});

module.exports = router;
