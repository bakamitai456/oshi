CREATE TABLE IF NOT EXISTS menu_items (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL,
  image_key   TEXT,
  is_available INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  key   TEXT    PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO counters (key, value) VALUES ('order_number', 0);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT    PRIMARY KEY,
  order_number  TEXT    UNIQUE NOT NULL,
  customer_name TEXT    NOT NULL,
  phone_number  TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'pending',
  total_amount  INTEGER NOT NULL,
  evidence_key  TEXT,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id           TEXT    PRIMARY KEY,
  order_id     TEXT    NOT NULL REFERENCES orders(id),
  menu_item_id TEXT    NOT NULL,
  name         TEXT    NOT NULL,
  price        INTEGER NOT NULL,
  quantity     INTEGER NOT NULL
);
