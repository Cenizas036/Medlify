-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ───────────────────────────────────────────────
--  Users
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  phone      TEXT        UNIQUE NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'customer'
               CHECK (role IN ('customer', 'pharmacy', 'delivery')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────────
--  Pharmacies
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacies (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  address    TEXT        NOT NULL,
  location   GEOGRAPHY(Point, 4326) NOT NULL,   -- PostGIS point (lng, lat)
  phone      TEXT,
  open_hours TEXT        NOT NULL DEFAULT '9:00 AM – 9:00 PM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for fast radius queries
CREATE INDEX IF NOT EXISTS pharmacies_location_idx
  ON pharmacies USING GIST (location);

-- ───────────────────────────────────────────────
--  Medicines
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicines (
  id                     SERIAL PRIMARY KEY,
  name                   TEXT NOT NULL,
  generic_name           TEXT,
  requires_prescription  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ───────────────────────────────────────────────
--  Inventory  (pharmacy ↔ medicine stock)
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id          SERIAL PRIMARY KEY,
  pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicine_id INTEGER NOT NULL REFERENCES medicines(id)  ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  price       NUMERIC(10, 2) NOT NULL,
  UNIQUE (pharmacy_id, medicine_id)
);

-- ───────────────────────────────────────────────
--  Orders
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER     REFERENCES users(id),
  pharmacy_id      INTEGER     NOT NULL REFERENCES pharmacies(id),
  status           TEXT        NOT NULL DEFAULT 'placed'
                     CHECK (status IN ('placed','accepted','out_for_delivery','delivered','cancelled')),
  delivery_address TEXT        NOT NULL,
  total            NUMERIC(10,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  medicine_id INTEGER        NOT NULL REFERENCES medicines(id),
  quantity    INTEGER        NOT NULL,
  price       NUMERIC(10,2) NOT NULL
);
