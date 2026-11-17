'use strict';
/**
 * scripts/bootstrap-db.js — prepares the database before the API starts.
 *
 * Runs on every start (see railway.json):
 *   first boot  → schema + seed data, migrations, OpenStreetMap pharmacies, demo accounts
 *   later boots → migrations only (they are idempotent)
 *
 * Each one-time step is recorded in the `medlify_bootstrap` table so it never
 * repeats. seed-osm.js truncates orders, so it must only ever run once.
 *
 * Usage:  node scripts/bootstrap-db.js
 */
require('dotenv').config();
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require('pg');

const ROOT = path.join(__dirname, '..');
const log = (msg) => console.log(`[bootstrap] ${msg}`);

function client() {
  return new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
}

async function waitForDatabase(attempts = 40, delayMs = 3000) {
  for (let i = 1; i <= attempts; i += 1) {
    const c = client();
    try {
      await c.connect();
      await c.query('SELECT 1');
      return c;
    } catch (err) {
      await c.end().catch(() => {});
      log(`database not ready (${err.code || err.message}), retry ${i}/${attempts}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Database never became reachable — check DATABASE_URL.');
}

function runScript(relPath) {
  log(`running ${relPath}`);
  const result = spawnSync(process.execPath, [path.join(ROOT, relPath)], {
    stdio: 'inherit',
    env: process.env,
  });
  return result.status === 0;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');

  const db = await waitForDatabase();
  let done;
  let hasTables;
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS medlify_bootstrap (
      step    TEXT PRIMARY KEY,
      done_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    done = new Set((await db.query('SELECT step FROM medlify_bootstrap')).rows.map((r) => r.step));
    hasTables = (await db.query(`SELECT to_regclass('public.pharmacies') IS NOT NULL AS ok`)).rows[0].ok;
  } finally {
    await db.end();
  }

  const mark = async (step) => {
    const c = client();
    await c.connect();
    try {
      await c.query('INSERT INTO medlify_bootstrap (step) VALUES ($1) ON CONFLICT DO NOTHING', [step]);
    } finally {
      await c.end();
    }
  };

  // 1. Schema + base seed (only on an empty database)
  if (!done.has('init')) {
    if (hasTables) log('tables already exist — skipping schema/seed');
    else if (!runScript('src/db/init.js')) throw new Error('Schema/seed failed.');
    await mark('init');
  }

  // 2. Migrations (safe to repeat)
  if (!runScript('src/db/migrate.js')) throw new Error('Migrations failed.');

  // 3. Real Bhubaneswar pharmacies from OpenStreetMap (once; keeps seed data if OSM is down)
  if (!done.has('osm')) {
    if (!runScript('src/db/seed-osm.js')) log('OpenStreetMap import failed — keeping the seed pharmacies');
    await mark('osm');
  }

  // 4. Demo accounts (retried on the next start if it fails)
  if (!done.has('demo')) {
    if (runScript('scripts/seed-demo.js')) await mark('demo');
    else log('demo accounts not created — will retry on next start');
  }

  log('database ready');
}

main().catch((err) => {
  console.error(`[bootstrap] ${err.message}`);
  process.exit(1);
});
