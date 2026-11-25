import type { AppLanguage } from "../bot/i18n.js";
import { dbEnabled } from "../db/pool.js";
import { getPool } from "../db/pool.js";
import { sendMessage } from "../max/client.js";

type LatestNotification = { id: string; message: string };

type UserRow = {
  id: string;
  max_user_id: string;
  language: string;
};

function pickLocalizedText(message: string, language: string): string {
  const [ru = "", en = ""] = message.split("#", 2);
  const lang: AppLanguage = language === "en" ? "en" : "ru";
  const text = lang === "ru" ? ru : en;
  return text.trim();
}

async function loadLatestNotification(): Promise<LatestNotification | null> {
  const res = await getPool().query<LatestNotification>(
    `SELECT id::text, message FROM notifications ORDER BY id DESC LIMIT 1`,
  );
  return res.rows[0] ?? null;
}

async function loadUsersBehindNotification(maxId: bigint): Promise<UserRow[]> {
  const res = await getPool().query<UserRow>(
    `SELECT u.id::text, u.max_user_id::text, COALESCE(s.language, 'ru') AS language
     FROM users u
     LEFT JOIN settings s ON s.user_id = u.id
     WHERE u.last_notification_id IS NULL OR u.last_notification_id < $1::bigint
     ORDER BY u.id`,
    [maxId.toString()],
  );
  return res.rows;
}

async function markUserNotified(userId: string, maxId: bigint): Promise<void> {
  await getPool().query(
    `UPDATE users SET last_notification_id = $1::bigint, updated_at = now() WHERE id = $2::bigint`,
    [maxId.toString(), userId],
  );
}

/** После старта: разослать последнее уведомление тем, у кого last_notification_id < max(id). */
export async function dispatchPendingNotifications(): Promise<void> {
  if (!dbEnabled()) return;

  const latest = await loadLatestNotification();
  if (!latest) {
    console.log("notifications: таблица пуста, пропуск");
    return;
  }

  const maxId = BigInt(latest.id);
  const users = await loadUsersBehindNotification(maxId);
  if (users.length === 0) {
    console.log(`notifications: все пользователи уже на id=${maxId}`);
    return;
  }

  console.log(`notifications: id=${maxId}, к отправке ${users.length} пользователей`);

  let sent = 0;
  let markedOnly = 0;
  let failed = 0;

  for (const row of users) {
    const text = pickLocalizedText(latest.message, row.language);
    const maxUserId = Number(row.max_user_id);
    if (!Number.isFinite(maxUserId)) {
      console.warn(`notifications: пропуск user id=${row.id}, неверный max_user_id`);
      continue;
    }

    if (!text) {
      await markUserNotified(row.id, maxId);
      markedOnly += 1;
      continue;
    }

    try {
      await sendMessage({ userId: maxUserId, text });
      await markUserNotified(row.id, maxId);
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`notifications: не отправлено max_user_id=${maxUserId}:`, err);
    }
  }

  console.log(
    `notifications: готово id=${maxId} — отправлено ${sent}, без текста (отмечено) ${markedOnly}, ошибок ${failed}`,
  );
}