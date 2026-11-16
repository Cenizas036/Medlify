'use strict';
const express = require('express');
const pool    = require('../db/pool');
const router  = express.Router();

router.get('/', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = Math.min(parseInt(req.query.radius, 10) || 10000, 50000);
  const q = String(req.query.q || '').trim();
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat and lng are required.' });
  try {
    const r = await pool.query(
      `SELECT p.id, p.name, p.address, p.phone, p.open_hours,
              ST_Y(p.location::geometry) AS latitude,
              ST_X(p.location::geometry) AS longitude,
              ROUND(ST_Distance(p.location, ST_MakePoint($2,$1)::geography)::numeric, 0)::int AS distance_m,
              (SELECT COUNT(*)::int FROM inventory i WHERE i.pharmacy_id = p.id AND i.quantity > 0) AS medicine_count
       FROM pharmacies p
       WHERE ST_DWithin(p.location, ST_MakePoint($2,$1)::geography, $3)
         AND ($4 = '' OR EXISTS (
               SELECT 1 FROM inventory i JOIN medicines m ON m.id = i.medicine_id
               WHERE i.pharmacy_id = p.id AND i.quantity > 0
                 AND (m.name ILIKE '%' || $4 || '%' OR m.generic_name ILIKE '%' || $4 || '%')))
       ORDER BY distance_m ASC`,
      [lat, lng, radius, q]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Pharmacy list error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid pharmacy id.' });
  try {
    const p = await pool.query(
      `SELECT id, name, address, phone, open_hours,
              ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude
       FROM pharmacies WHERE id=$1`, [id]);
    if (p.rows.length === 0) return res.status(404).json({ error: 'Pharmacy not found.' });
    const inv = await pool.query(
      `SELECT i.medicine_id, m.name, m.generic_name, m.requires_prescription, i.quantity, i.price
       FROM inventory i JOIN medicines m ON m.id = i.medicine_id
       WHERE i.pharmacy_id = $1 AND i.quantity > 0 ORDER BY m.name`, [id]);
    res.json({ ...p.rows[0], inventory: inv.rows });
  } catch (err) {
    console.error('Pharmacy detail error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
