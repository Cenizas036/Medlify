'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const router = express.Router();

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET missing in .env');
const sign = u => jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' });
const pub = u => ({ id: u.id, name: u.name, phone: u.phone, role: u.role, address: u.address || '' });
const phoneOk = p => /^[6-9]\d{9}$/.test(p);

router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' } }));

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'Login required.' });
  try { req.userId = jwt.verify(h.slice(7), SECRET).id; next(); }
  catch { res.status(401).json({ error: 'Session expired. Please log in again.' }); }
}

router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').replace(/\s/g, '');
  const password = String(req.body.password || '');
  const address = String(req.body.address || '').trim();
  // Accounts created from the pharmacy sign-up page are pharmacist accounts; everything else is a customer
  const role = req.body.account === 'pharmacy' ? 'pharmacy' : 'customer';
  if (name.length < 2) return res.status(400).json({ error: 'Enter your name.' });
  if (!phoneOk(phone)) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (address && address.length < 10) return res.status(400).json({ error: 'Address must be at least 10 characters.' });
  try {
    if ((await pool.query('SELECT 1 FROM users WHERE phone=$1', [phone])).rowCount)
      return res.status(409).json({ error: 'An account with this number already exists.' });
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO users (name, phone, role, password_hash, address) VALUES ($1,$2,$5,$3,$4) RETURNING id,name,phone,role,address`,
      [name, phone, hash, address || null, role]);
    res.status(201).json({ token: sign(r.rows[0]), user: pub(r.rows[0]) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
});

router.post('/login', async (req, res) => {
  const phone = String(req.body.phone || '').replace(/\s/g, '');
  const password = String(req.body.password || '');
  try {
    const r = await pool.query('SELECT * FROM users WHERE phone=$1', [phone]);
    const u = r.rows[0];
    if (!u || !u.password_hash || !(await bcrypt.compare(password, u.password_hash)))
      return res.status(400).json({ error: 'Incorrect phone number or password.' });
    res.json({ token: sign(u), user: pub(u) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
});

router.get('/me', requireAuth, async (req, res) => {
  const r = await pool.query('SELECT id,name,phone,role,address FROM users WHERE id=$1', [req.userId]);
  if (!r.rowCount) return res.status(401).json({ error: 'Account not found.' });
  res.json(pub(r.rows[0]));
});

// Only pharmacist accounts may use the pharmacy dashboard API. The role is read from the
// database on every request, so it can't be faked by editing the token or local storage.
async function requirePharmacist(req, res, next) {
  try {
    const r = await pool.query('SELECT role FROM users WHERE id=$1', [req.userId]);
    if (!r.rowCount) return res.status(401).json({ error: 'Account not found.' });
    if (r.rows[0].role !== 'pharmacy') return res.status(403).json({ error: 'Only pharmacy accounts can use the pharmacy dashboard.' });
    next();
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
}

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requirePharmacist = requirePharmacist;
