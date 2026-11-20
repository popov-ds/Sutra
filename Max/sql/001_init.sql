-- Sutra MAX bot — профиль и подписки (аналог YogaSheduler, max_user_id вместо telegram_id).

CREATE TABLE IF NOT EXISTS bot_users (
  max_user_id BIGINT PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'ru',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  max_user_id BIGINT NOT NULL REFERENCES bot_users (max_user_id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_payment_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_subscriptions_user_expires
  ON bot_subscriptions (max_user_id, expires_at DESC);