import type { PoolClient } from "pg";
import { getPool } from "./pool.js";
import { ensureBotUser } from "./users.js";

export type SubscriptionProvider = "promo" | "manual" | "yookassa" | "rustore";

export async function grantProDays(
  maxUserId: number,
  days: number,
  provider: SubscriptionProvider,
  externalPaymentId: string | null,
  existingClient?: PoolClient,
): Promise<{ expiresAt: Date }> {
  if (days <= 0) throw new Error("days must be positive");
  const pool = getPool();
  const client = existingClient ?? (await pool.connect());
  const own = !existingClient;
  try {
    if (own) await client.query("BEGIN");
    await ensureBotUser(maxUserId, "ru", client);
    const cur = await client.query<{ e: Date | null }>(
      `SELECT MAX(expires_at) AS e FROM bot_subscriptions
       WHERE max_user_id = $1 AND expires_at > now()`,
      [maxUserId],
    );
    const now = new Date();
    const base =
      cur.rows[0]?.e && new Date(cur.rows[0].e) > now ? new Date(cur.rows[0].e) : now;
    const expiresAt = new Date(base.getTime() + days * 86400000);
    await client.query(
      `INSERT INTO bot_subscriptions (max_user_id, plan, provider, external_payment_id, expires_at)
       VALUES ($1, 'pro', $2, $3, $4)`,
      [maxUserId, provider, externalPaymentId, expiresAt.toISOString()],
    );
    if (own) await client.query("COMMIT");
    return { expiresAt };
  } catch (err) {
    if (own) await client.query("ROLLBACK");
    throw err;
  } finally {
    if (own) client.release();
  }
}