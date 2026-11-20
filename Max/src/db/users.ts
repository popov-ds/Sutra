import type { PoolClient } from "pg";
import type { AppLanguage } from "../bot/i18n.js";
import { dbEnabled } from "./pool.js";
import { getPool } from "./pool.js";

let cloudEmailColumnReady = false;

/** После 005 (DROP) без 006 бот и Mini App падают на SELECT cloud_email. */
export async function ensureCloudEmailColumn(): Promise<void> {
  if (cloudEmailColumnReady || !dbEnabled()) return;
  try {
    await getPool().query(`ALTER TABLE bot_users ADD COLUMN IF NOT EXISTS cloud_email TEXT`);
    cloudEmailColumnReady = true;
  } catch (err) {
    console.error("ensureCloudEmailColumn:", err);
    cloudEmailColumnReady = true;
  }
}

type UserRow = {
  language: string;
  cloud_email: string | null;
};

function db(client?: PoolClient) {
  return client ?? getPool();
}

export async function ensureBotUser(
  maxUserId: number,
  defaultLanguage: AppLanguage = "ru",
  client?: PoolClient,
): Promise<void> {
  await db(client).query(
    `INSERT INTO bot_users (max_user_id, language)
     VALUES ($1, $2)
     ON CONFLICT (max_user_id) DO NOTHING`,
    [maxUserId, defaultLanguage],
  );
}

export async function isProActive(maxUserId: number): Promise<boolean> {
  const res = await getPool().query<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM bot_subscriptions
       WHERE max_user_id = $1 AND expires_at > now()
     ) AS ok`,
    [maxUserId],
  );
  return res.rows[0]?.ok ?? false;
}

export async function proExpiresAt(maxUserId: number): Promise<Date | null> {
  const res = await getPool().query<{ e: Date }>(
    `SELECT MAX(expires_at) AS e FROM bot_subscriptions
     WHERE max_user_id = $1 AND expires_at > now()`,
    [maxUserId],
  );
  return res.rows[0]?.e ?? null;
}

export async function getUserRow(maxUserId: number): Promise<UserRow | null> {
  await ensureCloudEmailColumn();
  const res = await getPool().query<UserRow>(
    `SELECT language, cloud_email FROM bot_users WHERE max_user_id = $1`,
    [maxUserId],
  );
  return res.rows[0] ?? null;
}

export async function setCloudEmail(maxUserId: number, email: string | null): Promise<void> {
  await ensureCloudEmailColumn();
  await ensureBotUser(maxUserId);
  await getPool().query(`UPDATE bot_users SET cloud_email = $2, updated_at = now() WHERE max_user_id = $1`, [
    maxUserId,
    email,
  ]);
}

export async function patchUser(
  maxUserId: number,
  patch: {
    language?: AppLanguage;
    cloudEmail?: string | null;
  },
): Promise<void> {
  await ensureBotUser(maxUserId, patch.language ?? "ru");
  if (patch.language !== undefined) {
    await getPool().query(`UPDATE bot_users SET language = $2, updated_at = now() WHERE max_user_id = $1`, [
      maxUserId,
      patch.language,
    ]);
  }
  if (patch.cloudEmail !== undefined) {
    await setCloudEmail(maxUserId, patch.cloudEmail);
  }
}