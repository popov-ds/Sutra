-- Yoga: облако только в Mini App, без cloud_email в bot_users.

ALTER TABLE bot_users DROP COLUMN IF EXISTS cloud_email;