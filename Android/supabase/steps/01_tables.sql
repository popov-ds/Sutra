-- Step 1/4: tables (run in Supabase SQL Editor, then Run)

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
