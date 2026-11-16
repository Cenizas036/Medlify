'use strict';
const express = require('express');
const pool    = require('../db/pool');
const router  = express.Router();

const SLUGS = ['pain-relief','diabetes-care','allergy-care','digestive-health','vitamins-supplements','first-aid'];

function geo(req) {
  const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
  const radius = Math.min(parseInt(req.query.radius, 10) || 10000, 50000);
  return { lat, lng, radius, ok: !isNaN(lat) && !isNaN(lng) };
}

async function withPharmacies(meds, g) {
  if (!meds.length) return [];
  const r = await pool.query(
    `SELECT i.medicine_id, p.id AS pharmacy_id, p.name AS pharmacy_name, p.address, i.quantity, i.price,
            ROUND(ST_Distance(p.location, ST_MakePoint($2,$1)::geography)::numeric,0)::int AS distance_m
     FROM inventory i JOIN pharmacies p ON p.id = i.pharmacy_id
     WHERE i.medicine_id = ANY($4::int[]) AND i.quantity > 0
       AND ST_DWithin(p.location, ST_MakePoint($2,$1)::geography, $3)
     ORDER BY distance_m ASC`,
    [g.lat, g.lng, g.radius, meds.map(m => m.id)]);
  return meds.map(m => ({ ...m, pharmacies: r.rows.filter(x => x.medicine_id === m.id) }));
}

// GET /api/catalog/categories  -> real counts from the medicines table
router.get('/categories', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT category, COUNT(*)::int AS medicine_count FROM medicines WHERE category IS NOT NULL GROUP BY category`);
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
});

// GET /api/catalog/categories/:slug?lat&lng&radius
router.get('/categories/:slug', async (req, res) => {
  const g = geo(req);
  if (!SLUGS.includes(req.params.slug)) return res.status(404).json({ error: 'Unknown category.' });
  if (!g.ok) return res.status(400).json({ error: 'lat and lng are required.' });
  try {
    const m = await pool.query(
      `SELECT id, name, generic_name, requires_prescription, category, form, drug_class, summary FROM medicines WHERE category = $1 ORDER BY name`, [req.params.slug]);
    res.json({ category: req.params.slug, medicines: await withPharmacies(m.rows, g) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
});

// GET /api/catalog/medicines/:id?lat&lng&radius
router.get('/medicines/:id', async (req, res) => {
  const g = geo(req), id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid medicine id.' });
  if (!g.ok) return res.status(400).json({ error: 'lat and lng are required.' });
  try {
    const m = await pool.query(`SELECT id, name, generic_name, requires_prescription, category, form, drug_class, summary FROM medicines WHERE id = $1`, [id]);
    if (!m.rows.length) return res.status(404).json({ error: 'Medicine not found.' });
    res.json((await withPharmacies(m.rows, g))[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error.' }); }
});

module.exports = router;
