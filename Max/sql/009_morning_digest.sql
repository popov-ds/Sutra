-- Утренний дайджест касаний в чат MAX (Pro + Supabase).

ALTER TABLE settings ADD COLUMN IF NOT EXISTS supabase_user_id UUID;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS last_digest_touch_on DATE;