'use strict';
const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('./auth');
const router = express.Router();
router.use(requireAuth);

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
    await pool.query("UPDATE users SET role='pharmacy' WHERE id=$1", [req.userId]).catch(console.error);
    res.json({ ok: true });
  } catch (e) { fail(res, e); }
});

router.get('/pharmacy', mine, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT i.medicine_id, m.name, m.generic_name, m.requires_prescription, m.category, m.form, i.quantity, i.price
       FROM inventory i JOIN medicines m ON m.id = i.medicine_id WHERE i.pharmacy_id = $1 ORDER BY m.name`, [req.ph.id]);
    res.json({ pharmacy: req.ph, inventory: r.rows });
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
