-- Модель Yoga: в bot_users только профиль чата (язык).

ALTER TABLE bot_users DROP COLUMN IF EXISTS cloud_linked;
ALTER TABLE bot_users DROP COLUMN IF EXISTS cloud_email;
ALTER TABLE bot_users DROP COLUMN IF EXISTS dialog;
ALTER TABLE bot_users DROP COLUMN IF EXISTS otp_email;