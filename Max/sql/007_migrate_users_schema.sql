-- bot_users → settings, bot_subscriptions → subscriptions, max_user_id → users.id
-- Порядок: users → subscriptions/promo (снять FK с bot_users_pkey) → settings (PK).

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  max_user_id BIGINT NOT NULL UNIQUE,
  last_notification_id BIGINT REFERENCES notifications (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $backfill_users$
BEGIN
  IF to_regclass('public.bot_users') IS NOT NULL THEN
    INSERT INTO users (max_user_id, created_at, updated_at)
    SELECT bu.max_user_id, bu.created_at, bu.updated_at
    FROM bot_users bu
    ON CONFLICT (max_user_id) DO NOTHING;
  ELSIF to_regclass('public.settings') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'max_user_id'
    ) THEN
    INSERT INTO users (max_user_id, created_at, updated_at)
    SELECT s.max_user_id, s.created_at, s.updated_at
    FROM settings s
    ON CONFLICT (max_user_id) DO NOTHING;
  END IF;
END
$backfill_users$;

DO $subscriptions$
BEGIN
  IF to_regclass('public.bot_subscriptions') IS NOT NULL THEN
    ALTER TABLE bot_subscriptions RENAME TO subscriptions;
  END IF;
  IF to_regclass('public.subscriptions') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'user_id'
  ) THEN
    RETURN;
  END IF;

  ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS bot_subscriptions_max_user_id_fkey;
  ALTER TABLE subscriptions ADD COLUMN user_id BIGINT REFERENCES users (id);

  UPDATE subscriptions sub
  SET user_id = u.id
  FROM users u
  WHERE u.max_user_id = sub.max_user_id;

  ALTER TABLE subscriptions ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE subscriptions DROP COLUMN max_user_id;

  DROP INDEX IF EXISTS idx_bot_subscriptions_user_expires;
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_expires
    ON subscriptions (user_id, expires_at DESC);

  DROP INDEX IF EXISTS idx_bot_subscriptions_external;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_external
    ON subscriptions (provider, external_payment_id)
    WHERE external_payment_id IS NOT NULL;
END
$subscriptions$;

DO $promo_user_id$
BEGIN
  IF to_regclass('public.promo_redemptions') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'promo_redemptions' AND column_name = 'user_id'
  ) THEN
    RETURN;
  END IF;

  ALTER TABLE promo_redemptions DROP CONSTRAINT IF EXISTS promo_redemptions_max_user_id_fkey;
  ALTER TABLE promo_redemptions ADD COLUMN user_id BIGINT REFERENCES users (id);

  UPDATE promo_redemptions pr
  SET user_id = u.id
  FROM users u
  WHERE u.max_user_id = pr.max_user_id;

  ALTER TABLE promo_redemptions ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE promo_redemptions DROP CONSTRAINT IF EXISTS promo_redemptions_max_user_id_code_key;
  ALTER TABLE promo_redemptions DROP COLUMN max_user_id;
  ALTER TABLE promo_redemptions DROP CONSTRAINT IF EXISTS promo_redemptions_user_id_code_key;
  ALTER TABLE promo_redemptions ADD CONSTRAINT promo_redemptions_user_id_code_key UNIQUE (user_id, code);
END
$promo_user_id$;

DO $settings_user_id$
BEGIN
  IF to_regclass('public.bot_users') IS NOT NULL THEN
    ALTER TABLE bot_users RENAME TO settings;
  END IF;
  IF to_regclass('public.settings') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE settings ADD COLUMN user_id BIGINT REFERENCES users (id);

    UPDATE settings s
    SET user_id = u.id
    FROM users u
    WHERE u.max_user_id = s.max_user_id;

    ALTER TABLE settings ALTER COLUMN user_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'max_user_id'
  ) THEN
    ALTER TABLE settings DROP CONSTRAINT IF EXISTS bot_users_pkey;
    ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
    ALTER TABLE settings DROP COLUMN max_user_id;
    ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
    ALTER TABLE settings ADD CONSTRAINT settings_pkey PRIMARY KEY (user_id);
  END IF;
END
$settings_user_id$;