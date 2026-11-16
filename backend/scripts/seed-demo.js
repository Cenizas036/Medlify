'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');

const OWNER = { name: 'Demo Pharmacist', phone: '9000000001', password: 'Demo@1234', licence: 'DEMO-OD-BBSR-0001' };
const CUSTOMER = { name: 'Demo Customer', phone: '9000000002', password: 'Demo@1234', address: 'Plot 12, Saheed Nagar, Bhubaneswar, Odisha 751007' };
// [medicine, quantity, price]  (demo values; 6 = shows "Low stock", 0 = hidden from customers)
const STOCK = [
  ['Paracetamol 500mg', 120, 22], ['Dolo 650', 80, 32], ['Ibuprofen 400mg', 6, 38], ['Cetirizine 10mg', 45, 24],
  ['Metformin 500mg', 60, 28], ['Omeprazole 20mg', 0, 55], ['ORS Sachet', 30, 20], ['Vitamin C 500mg', 14, 40], ['Clotrimazole Cream', 25, 65],
];

async function upsertUser(u, role) {
  const hash = await bcrypt.hash(u.password, 10);
  const ex = await pool.query('SELECT id FROM users WHERE phone=$1', [u.phone]);
  if (ex.rowCount) { await pool.query('UPDATE users SET name=$2, password_hash=$3, role=$4 WHERE id=$1', [ex.rows[0].id, u.name, hash, role]); return ex.rows[0].id; }
  return (await pool.query('INSERT INTO users (name, phone, role, password_hash) VALUES ($1,$2,$3,$4) RETURNING id', [u.name, u.phone, role, hash])).rows[0].id;
}

(async () => {
  try {
    await pool.query('ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS drug_licence_no TEXT').catch(() => {});
    const ownerId = await upsertUser(OWNER, 'pharmacy');
    let ph = (await pool.query('SELECT id, name FROM pharmacies WHERE owner_user_id=$1', [ownerId])).rows[0];
    if (!ph) {
      ph = (await pool.query(`SELECT id, name FROM pharmacies WHERE owner_user_id IS NULL ORDER BY (name ILIKE '%apollo%') DESC, id LIMIT 1`)).rows[0];
      if (!ph) throw new Error('No unclaimed pharmacy is left to assign.');
      await pool.query('UPDATE pharmacies SET owner_user_id=$1 WHERE id=$2', [ownerId, ph.id]);
    }
    await pool.query('UPDATE pharmacies SET drug_licence_no=$1 WHERE id=$2', [OWNER.licence, ph.id]);
    for (const [name, qty, price] of STOCK) {
      const m = await pool.query('SELECT id FROM medicines WHERE name=$1', [name]);
      if (!m.rowCount) { console.log('  skipped (not in catalogue):', name); continue; }
      await pool.query(`INSERT INTO inventory (pharmacy_id, medicine_id, quantity, price) VALUES ($1,$2,$3,$4)
        ON CONFLICT (pharmacy_id, medicine_id) DO UPDATE SET quantity=EXCLUDED.quantity, price=EXCLUDED.price`, [ph.id, m.rows[0].id, qty, price]);
    }
    const custId = await upsertUser(CUSTOMER, 'customer');
    if (!(await pool.query('SELECT 1 FROM addresses WHERE user_id=$1', [custId])).rowCount)
      await pool.query(`INSERT INTO addresses (user_id,label,recipient_name,recipient_phone,is_self,address,lat,lng,is_default)
        VALUES ($1,'Home',$2,$3,true,$4,20.2961,85.8245,true)`, [custId, CUSTOMER.name, CUSTOMER.phone, CUSTOMER.address]);
    console.log(`\nDemo ready.\n  Pharmacy: ${ph.name} (id ${ph.id})\n  Owner login:    ${OWNER.phone} / ${OWNER.password}   licence ${OWNER.licence}\n  Customer login: ${CUSTOMER.phone} / ${CUSTOMER.password}\n`);
  } catch (e) { console.error('Seed failed:', e.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
