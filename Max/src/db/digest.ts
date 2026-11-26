import { getPool } from "./pool.js";

export type DigestRecipient = {
  userId: string;
  maxUserId: number;
  language: string;
  supabaseUserId: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export async function setCloudLink(
  maxUserId: number,
  link: { supabaseUserId: string | null; cloudEmail?: string | null },
): Promise<void> {
  if (link.supabaseUserId !== null && !isUuid(link.supabaseUserId)) {
    throw new Error("invalid_supabase_user_id");
  }
  await getPool().query(
    `UPDATE settings SET
       supabase_user_id = $2::uuid,
       cloud_email = COALESCE($3, cloud_email),
       updated_at = now()
     WHERE user_id = (SELECT id FROM users WHERE max_user_id = $1)`,
    [maxUserId, link.supabaseUserId, link.cloudEmail?.trim() || null],
  );
}

export async function clearCloudLink(maxUserId: number): Promise<void> {
  await getPool().query(
    `UPDATE settings SET supabase_user_id = NULL, updated_at = now()
     WHERE user_id = (SELECT id FROM users WHERE max_user_id = $1)`,
    [maxUserId],
  );
}

export async function listDigestRecipients(touchOn: string): Promise<DigestRecipient[]> {
  const res = await getPool().query<{
    user_id: string;
    max_user_id: string;
    language: string;
    supabase_user_id: string;
  }>(
    `SELECT u.id::text AS user_id, u.max_user_id::text, COALESCE(s.language, 'ru') AS language,
            s.supabase_user_id::text
     FROM users u
     INNER JOIN settings s ON s.user_id = u.id
     WHERE s.supabase_user_id IS NOT NULL
       AND COALESCE(s.digest_enabled, true) = true
       AND (s.last_digest_touch_on IS NULL OR s.last_digest_touch_on < $1::date)
       AND EXISTS (
         SELECT 1 FROM subscriptions sub
         WHERE sub.user_id = u.id AND sub.expires_at > now()
       )
     ORDER BY u.id`,
    [touchOn],
  );
  return res.rows
    .map((row) => ({
      userId: row.user_id,
      maxUserId: Number(row.max_user_id),
      language: row.language,
      supabaseUserId: row.supabase_user_id,
    }))
    .filter((row) => Number.isFinite(row.maxUserId) && row.maxUserId > 0);
}

export async function markDigestSent(userId: string, touchOn: string): Promise<void> {
  await getPool().query(
    `UPDATE settings SET last_digest_touch_on = $2::date, updated_at = now() WHERE user_id = $1::bigint`,
    [userId, touchOn],
  );
}