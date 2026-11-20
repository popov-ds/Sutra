import { dbEnabled } from "../db/pool.js";
import { isProActive } from "../db/users.js";
import { sendMessage } from "../max/client.js";
import { strings, type AppLanguage } from "./i18n.js";
import { mainMenuKeyboard } from "./keyboard.js";
import { proPromoButtons } from "./promoFlow.js";

export async function showProInfo(userId: number, lang: AppLanguage): Promise<void> {
  const t = strings(lang);
  const pro = dbEnabled() ? await isProActive(userId) : false;
  let text: string = t.pro;
  if (!pro && dbEnabled()) {
    text = `${t.pro}\n\n${t.promoStatusHint}`;
  }
  const menu = await mainMenuKeyboard(lang, userId);
  const buttons = pro ? menu : [...proPromoButtons(lang), ...menu];
  await sendMessage({
    userId,
    text,
    buttons,
    format: "markdown",
  });
}