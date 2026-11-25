DO $billing$
BEGIN
  IF to_regclass('public.bot_subscriptions') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_subscriptions_external
      ON bot_subscriptions (provider, external_payment_id)
      WHERE external_payment_id IS NOT NULL;
  ELSIF to_regclass('public.subscriptions') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_external
      ON subscriptions (provider, external_payment_id)
      WHERE external_payment_id IS NOT NULL;
  END IF;
END
$billing$;