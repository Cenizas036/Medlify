-- Migration 005: saved delivery addresses (used by /api/me/addresses and seed-demo.js)
--                and the pharmacy drug licence number (used by owner claims)
CREATE TABLE IF NOT EXISTS addresses (
  id              SERIAL PRIMARY KEY,
  user_id         INT              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label           TEXT             NOT NULL DEFAULT 'Home',
  recipient_name  TEXT             NOT NULL,
  recipient_phone TEXT             NOT NULL,
  address         TEXT             NOT NULL,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  is_self         BOOLEAN          NOT NULL DEFAULT FALSE,
  is_default      BOOLEAN          NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS addresses_user_idx ON addresses(user_id);

ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS drug_licence_no TEXT;
