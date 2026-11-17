const pool = require('./pool');

const BBOX = '20.15,85.70,20.42,85.95'; // Bhubaneswar area (south,west,north,east)
const QUERY = `[out:json][timeout:60];
nwr["amenity"="pharmacy"](${BBOX});
out center;`;

async function run() {
  console.log('Fetching pharmacies from OpenStreetMap...');
  // The main Overpass server is often overloaded (502/504), so fall back to public mirrors
  const ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ];
  let data;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(QUERY),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Medlify-demo/1.0 (student project)', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.json();
      break;
    } catch (e) {
      console.log(`  ${new URL(url).host} failed (${e.cause?.code || e.message})`);
    }
  }
  if (!data) throw new Error('All Overpass servers failed.');

  const shops = data.elements
    .map((e) => ({
      lat: e.lat ?? e.center?.lat,
      lng: e.lon ?? e.center?.lon,
      name: e.tags?.name || 'Medical Store',
      phone: e.tags?.phone || e.tags?.['contact:phone'] || null,
      hours: e.tags?.opening_hours || '9:00 AM – 9:00 PM',
      address:
        [e.tags?.['addr:housenumber'], e.tags?.['addr:street'], e.tags?.['addr:suburb'], e.tags?.['addr:city']]
          .filter(Boolean).join(', ') || 'Bhubaneswar, Odisha',
    }))
    .filter((s) => s.lat && s.lng);

  console.log(`Found ${shops.length} pharmacies.`);
  if (shops.length === 0) throw new Error('No pharmacies found.');

  const client = await pool.connect();
  try {
    await client.query('TRUNCATE order_items, orders, inventory, pharmacies RESTART IDENTITY CASCADE');
    for (const s of shops) {
      await client.query(
        `INSERT INTO pharmacies (name, address, location, phone, open_hours)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, $6)`,
        [s.name, s.address, s.lng, s.lat, s.phone, s.hours]
      );
    }
    // Simulated stock: each pharmacy gets 20-35 random medicines
    await client.query(`
      INSERT INTO inventory (pharmacy_id, medicine_id, quantity, price)
      SELECT p.id, m.id, 5 + floor(random()*100)::int, ROUND((5 + random()*195)::numeric, 2)
      FROM pharmacies p
      JOIN medicines m ON random() < 0.6
      ON CONFLICT DO NOTHING
    `);
    console.log('Done. Pharmacies and simulated stock loaded.');
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch((e) => { console.error(e.message); process.exit(1); });
