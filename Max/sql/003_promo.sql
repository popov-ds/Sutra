-- Промокоды из PROMO_CODES в .env (синхронизация при старте бота).

CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,
  days INT NOT NULL CHECK (days > 0),
  max_uses INT CHECK (max_uses IS NULL OR max_uses > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id BIGSERIAL PRIMARY KEY,
  max_user_id BIGINT NOT NULL REFERENCES bot_users (max_user_id) ON DELETE CASCADE,
  code TEXT NOT NULL REFERENCES promo_codes (code) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (max_user_id, code)
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_redemptions (code);