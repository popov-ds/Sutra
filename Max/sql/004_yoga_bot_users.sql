-- Модель Yoga: в settings / bot_users только профиль чата (язык).

DO $profile$
BEGIN
  IF to_regclass('public.bot_users') IS NOT NULL THEN
    ALTER TABLE bot_users DROP COLUMN IF EXISTS cloud_linked;
    ALTER TABLE bot_users DROP COLUMN IF EXISTS cloud_email;
    ALTER TABLE bot_users DROP COLUMN IF EXISTS dialog;
    ALTER TABLE bot_users DROP COLUMN IF EXISTS otp_email;
  ELSIF to_regclass('public.settings') IS NOT NULL THEN
    ALTER TABLE settings DROP COLUMN IF EXISTS cloud_linked;
    ALTER TABLE settings DROP COLUMN IF EXISTS cloud_email;
    ALTER TABLE settings DROP COLUMN IF EXISTS dialog;
    ALTER TABLE settings DROP COLUMN IF EXISTS otp_email;
  END IF;
END
$profile$;