-- Run in Supabase SQL Editor (Dashboard → SQL → New query).
-- Enables email OTP sign-in and per-user CRM data with RLS.

CREATE TABLE IF NOT EXISTS clients (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  health_tags TEXT NOT NULL DEFAULT '[]',
  family_notes TEXT NOT NULL DEFAULT '',
  client_request_id TEXT,
  regular_since TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS client_requests (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS products (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS purchases (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  purchased_on TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS tasks (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  purchase_id TEXT,
  touch_on TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_clients_updated ON clients (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_client_requests_updated ON client_requests (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_products_updated ON products (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_purchases_updated ON purchases (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks (user_id, updated_at);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clients_self ON clients;
DROP POLICY IF EXISTS client_requests_self ON client_requests;
DROP POLICY IF EXISTS products_self ON products;
DROP POLICY IF EXISTS purchases_self ON purchases;
DROP POLICY IF EXISTS tasks_self ON tasks;

CREATE POLICY clients_self ON clients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY client_requests_self ON client_requests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY products_self ON products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY purchases_self ON purchases FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY tasks_self ON tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
