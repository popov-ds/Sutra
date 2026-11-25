-- Yoga: облако только в Mini App, без cloud_email в settings / bot_users.

DO $cloud_drop$
BEGIN
  IF to_regclass('public.bot_users') IS NOT NULL THEN
    ALTER TABLE bot_users DROP COLUMN IF EXISTS cloud_email;
  ELSIF to_regclass('public.settings') IS NOT NULL THEN
    ALTER TABLE settings DROP COLUMN IF EXISTS cloud_email;
  END IF;
END
$cloud_drop$;