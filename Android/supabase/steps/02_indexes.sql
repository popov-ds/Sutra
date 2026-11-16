-- Step 2/4: indexes

CREATE INDEX IF NOT EXISTS idx_clients_updated ON clients (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_client_requests_updated ON client_requests (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_products_updated ON products (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_purchases_updated ON purchases (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks (user_id, updated_at);
