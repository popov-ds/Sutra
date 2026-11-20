import { strings, type AppLanguage } from "../bot/i18n.js";
import { config } from "../config.js";
import { dbEnabled } from "../db/pool.js";
import { getBotUser } from "../db/botUsers.js";
import { isProActive, proExpiresAt } from "../db/users.js";
import { isProTier } from "../domain/plan.js";

function formatExpires(d: Date, lang: AppLanguage): string {
  const locale = lang === "en" ? "en-US" : "ru-RU";
  return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

export async function tariffMessage(maxUserId: number, lang: AppLanguage): Promise<string> {
  const t = strings(lang);
  if (dbEnabled()) {
    const pro = await isProActive(maxUserId);
    if (!pro) return t.tariffFree(config.freeRecordLimit);
    const exp = await proExpiresAt(maxUserId);
    const until = exp ? formatExpires(exp, lang) : "?";
    return t.tariffProActive(until);
  }
  const user = await getBotUser(maxUserId);
  if (user && isProTier(user.tier)) {
    const until = user.proExpiresAt ? formatExpires(new Date(user.proExpiresAt), lang) : "?";
    return t.tariffProActive(until);
  }
  return t.tariffFree(config.freeRecordLimit);
}