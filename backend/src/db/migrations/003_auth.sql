ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_key ON users(phone);
CREATE TABLE IF NOT EXISTS user_cabinet (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medicine_id INT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, medicine_id)
);
