import type { AppLanguage } from "../bot/i18n.js";
import { todayIsoInTimeZone } from "../domain/digestDates.js";
import { buildMorningDigest, digestCopy } from "../domain/morningDigest.js";
import { config } from "../config.js";
import { dbEnabled } from "../db/pool.js";
import { listDigestRecipients, markDigestSent } from "../db/digest.js";
import { sendMessage } from "../max/client.js";
import { loadDigestTasksForDay, markOverdueInCloud } from "./morningDigestTasks.js";
import { supabaseAdminEnabled } from "./supabaseAdmin.js";

const SEND_GAP_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runMorningDigestJob(now = new Date()): Promise<void> {
  if (!config.morningDigestEnabled || !dbEnabled() || !supabaseAdminEnabled()) {
    return;
  }

  const touchOn = todayIsoInTimeZone(config.morningDigestTz, now);
  const recipients = await listDigestRecipients(touchOn);
  if (recipients.length === 0) {
    console.log(`morning-digest: нет получателей на ${touchOn}`);
    return;
  }

  console.log(`morning-digest: ${touchOn}, получателей ${recipients.length}`);

  let sent = 0;
  let empty = 0;
  let failed = 0;

  for (const row of recipients) {
    const lang: AppLanguage = row.language === "en" ? "en" : "ru";
    try {
      await markOverdueInCloud(row.supabaseUserId, touchOn);
      const tasks = await loadDigestTasksForDay(row.supabaseUserId, touchOn, lang);
      const digest = buildMorningDigest(touchOn, tasks, lang, digestCopy(lang, touchOn));
      if (!digest) {
        await markDigestSent(row.userId, touchOn);
        empty += 1;
        continue;
      }
      const text = `${digest.title}\n\n${digest.body}`;
      await sendMessage({ userId: row.maxUserId, text });
      await markDigestSent(row.userId, touchOn);
      sent += 1;
      await sleep(SEND_GAP_MS);
    } catch (err) {
      failed += 1;
      console.error(`morning-digest: max_user_id=${row.maxUserId}:`, err);
    }
  }

  console.log(`morning-digest: готово — отправлено ${sent}, пусто ${empty}, ошибок ${failed}`);
}