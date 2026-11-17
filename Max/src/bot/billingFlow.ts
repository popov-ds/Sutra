import { sendMessage } from "../max/client.js";
import { strings, type AppLanguage } from "./i18n.js";
import { mainMenuKeyboard } from "./keyboard.js";

export async function showProInfo(userId: number, lang: AppLanguage): Promise<void> {
  const t = strings(lang);
  await sendMessage({
    userId,
    text: t.pro,
    buttons: await mainMenuKeyboard(lang, userId),
    format: "markdown",
  });
}