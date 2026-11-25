-- Вход в облако через чат бота (email после OTP).

DO $cloud_add$
BEGIN
  IF to_regclass('public.bot_users') IS NOT NULL THEN
    ALTER TABLE bot_users ADD COLUMN IF NOT EXISTS cloud_email TEXT;
  ELSIF to_regclass('public.settings') IS NOT NULL THEN
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS cloud_email TEXT;
  END IF;
END
$cloud_add$;