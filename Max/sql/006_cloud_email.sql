-- Вход в облако через чат бота (email после OTP).

ALTER TABLE bot_users ADD COLUMN IF NOT EXISTS cloud_email TEXT;