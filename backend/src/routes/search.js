const express = require('express');
const pool    = require('../db/pool');
const router  = express.Router();

/**
 * GET /api/search
 * Query params:
 *   q       — medicine name fragment (required)
 *   lat     — user latitude  (required)
 *   lng     — user longitude (required)
 *   radius  — search radius in metres (default 10000)
 */
router.get('/', async (req, res) => {
  const { q, lat, lng, radius = 10000 } = req.query;

  if (!q || !lat || !lng) {
    return res.status(400).json({ error: 'q, lat, and lng are required.' });
  }

  const latitude  = parseFloat(lat);
  const longitude = parseFloat(lng);
  const radiusM   = Math.min(parseInt(radius, 10) || 10000, 50000); // cap at 50 km

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'lat and lng must be valid numbers.' });
  }

  try {
    // Fetch all matching pharmacies (with their matched medicines)
    const pharmacySQL = `
      SELECT
        p.id                                                                         AS pharmacy_id,
        p.name                                                                       AS pharmacy_name,
        p.address,
        p.phone,
        p.open_hours,
        ST_X(p.location::geometry)                                                   AS longitude,
        ST_Y(p.location::geometry)                                                   AS latitude,
        ROUND(ST_Distance(p.location, ST_MakePoint($2, $1)::geography)::numeric, 0) AS distance_m,
        json_agg(json_build_object(
          'medicine_id',   m.id,
          'name',          m.name,
          'generic_name',  m.generic_name,
          'prescription',  m.requires_prescription,
          'quantity',      i.quantity,
          'price',         i.price
        ) ORDER BY m.name) AS medicines
      FROM pharmacies p
      JOIN inventory  i ON i.pharmacy_id = p.id
      JOIN medicines  m ON m.id          = i.medicine_id
      WHERE (m.name ILIKE '%' || $3 || '%' OR m.generic_name ILIKE '%' || $3 || '%')
        AND i.quantity > 0
        AND ST_DWithin(p.location, ST_MakePoint($2, $1)::geography, $4)
      GROUP BY p.id
      ORDER BY distance_m ASC;
    `;

    const result = await pool.query(pharmacySQL, [latitude, longitude, q, radiusM]);

    // Also return medicine suggestions for autocomplete
    const medSQL = `
      SELECT DISTINCT m.name, m.generic_name, m.requires_prescription
      FROM medicines m
      WHERE (m.name ILIKE '%' || $1 || '%' OR m.generic_name ILIKE '%' || $1 || '%')
      LIMIT 10;
    `;
    const medResult = await pool.query(medSQL, [q]);

    res.json({
      query:       q,
      lat:         latitude,
      lng:         longitude,
      radius_m:    radiusM,
      pharmacies:  result.rows,
      suggestions: medResult.rows,
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/medicines/autocomplete?q=
 * Returns up to 10 medicine name suggestions.
 */
router.get('/medicines', async (req, res) => {
  const { q = '' } = req.query;
  try {
    const result = await pool.query(
      `SELECT id, name, generic_name, requires_prescription
       FROM medicines
       WHERE (name ILIKE '%' || $1 || '%' OR generic_name ILIKE '%' || $1 || '%')
       ORDER BY name
       LIMIT 10`,
      [q]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Medicine autocomplete error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
