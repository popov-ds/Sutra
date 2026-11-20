CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_subscriptions_external
  ON bot_subscriptions (provider, external_payment_id)
  WHERE external_payment_id IS NOT NULL;