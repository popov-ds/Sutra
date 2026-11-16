export const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('newbie', 'regular', 'candidate', 'partner')),
  health_tags TEXT NOT NULL DEFAULT '[]',
  family_notes TEXT NOT NULL DEFAULT '',
  regular_since TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced'))
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  purchased_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id),
  purchase_id TEXT REFERENCES purchases(id),
  touch_on TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('service', 'upsell', 'partnership')),
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('pending', 'done', 'overdue')),
  source TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_day ON tasks(touch_on);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_purchases_client ON purchases(client_id);

CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  op TEXT NOT NULL CHECK (op IN ('upsert', 'delete')),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export const MIGRATION_V2 = `
CREATE TABLE IF NOT EXISTS client_requests (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced'))
);

ALTER TABLE clients ADD COLUMN client_request_id TEXT REFERENCES client_requests(id);
`;
