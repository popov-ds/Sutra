import { config } from "../config.js";
import { getPool } from "./pool.js";
import { grantProDays } from "./subscriptions.js";
import { ensureBotUser } from "./users.js";

export type RedeemPromoResult =
  | { ok: true; expiresAt: Date; days: number }
  | { ok: false; reason: "invalid" | "unknown" | "used" | "exhausted" };

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export async function syncPromoCodesFromEnv(): Promise<number> {
  const pool = getPool();
  let n = 0;
  for (const row of config.promoCodes) {
    await pool.query(
      `INSERT INTO promo_codes (code, days, max_uses, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (code) DO UPDATE
       SET days = EXCLUDED.days, max_uses = EXCLUDED.max_uses, updated_at = now()`,
      [row.code, row.days, row.maxUses],
    );
    n += 1;
  }
  return n;
}

export async function redeemPromoCode(maxUserId: number, rawCode: string): Promise<RedeemPromoResult> {
  const code = normalizeCode(rawCode);
  if (!code || code.length > 64) return { ok: false, reason: "invalid" };

  const pool = getPool();
  const def = await pool.query<{ days: number; max_uses: number | null }>(
    `SELECT days, max_uses FROM promo_codes WHERE code = $1`,
    [code],
  );
  if ((def.rowCount ?? 0) === 0) return { ok: false, reason: "unknown" };

  const used = await pool.query(
    `SELECT 1 FROM promo_redemptions
     WHERE user_id = (SELECT id FROM users WHERE max_user_id = $1) AND code = $2`,
    [maxUserId, code],
  );
  if ((used.rowCount ?? 0) > 0) return { ok: false, reason: "used" };

  const { days, max_uses: maxUses } = def.rows[0]!;
  if (maxUses !== null) {
    const total = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM promo_redemptions WHERE code = $1`,
      [code],
    );
    if (Number(total.rows[0]?.c ?? "0") >= maxUses) return { ok: false, reason: "exhausted" };
  }

  const externalId = `promo:${code}:${maxUserId}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureBotUser(maxUserId, "ru", client);
    const { expiresAt } = await grantProDays(maxUserId, days, "promo", externalId, client);
    await client.query(
      `INSERT INTO promo_redemptions (user_id, code)
       VALUES ((SELECT id FROM users WHERE max_user_id = $1), $2)`,
      [maxUserId, code],
    );
    await client.query("COMMIT");
    return { ok: true, expiresAt, days };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}