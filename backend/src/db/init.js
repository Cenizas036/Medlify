/**
 * db/init.js  —  Run schema.sql then seed.sql against the database.
 * Usage:  node src/db/init.js
 */
const fs   = require('fs');
const path = require('path');
const pool = require('./pool');

async function init() {
  const client = await pool.connect();
  try {
    console.log('⚙️  Running schema...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅  Schema applied.');

    console.log('🌱  Running seed...');
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await client.query(seed);
    console.log('✅  Seed data inserted.');
  } catch (err) {
    console.error('❌  Init failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

init();
