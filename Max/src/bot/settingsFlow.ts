import { getBotUser, upsertBotUser } from "../db/botUsers.js";
import { sendMessage, type MaxInlineButton, type MessageTarget } from "../max/client.js";
import { strings, type AppLanguage } from "./i18n.js";
import { sendBotMenu } from "./sendMenu.js";

async function sendInline(target: MessageTarget, text: string, buttons: MaxInlineButton[][]): Promise<void> {
  await sendMessage({ ...target, text, buttons });
}

export async function sendSettingsMain(target: MessageTarget, lang?: AppLanguage): Promise<void> {
  const userId = target.userId;
  if (userId == null) return;
  try {
    await upsertBotUser(userId, {});
    const user = await getBotUser(userId);
    const l = lang ?? user?.language ?? "ru";
    const t = strings(l);
    await sendInline(target, t.settingsTitle, [
      [{ type: "callback", text: t.btnLanguage, payload: "sutra:set:lang" }],
      [{ type: "callback", text: t.btnBack, payload: "sutra:set:back" }],
    ]);
  } catch (err) {
    const l = lang ?? "ru";
    const t = strings(l);
    console.error("sendSettingsMain:", err);
    await sendBotMenu(target, `${t.settingsTitle}\n\n${t.botTempError}`, l);
  }
}

export async function handleSettingsCallback(target: MessageTarget, payload: string): Promise<void> {
  const userId = target.userId;
  if (userId == null) return;
  const user = await upsertBotUser(userId, {});
  const lang = user.language;
  const t = strings(lang);

  if (payload === "sutra:set:back") {
    await sendBotMenu(target, t.menuRestored, lang);
    return;
  }
  if (payload === "sutra:set:lang") {
    await sendInline(target, t.languageTitle, [
      [{ type: "callback", text: t.langRu, payload: "sutra:lang:ru" }],
      [{ type: "callback", text: t.langEn, payload: "sutra:lang:en" }],
      [{ type: "callback", text: t.btnBack, payload: "sutra:set:main" }],
    ]);
    return;
  }
  if (payload === "sutra:lang:ru" || payload === "sutra:lang:en") {
    const nextLang = payload.endsWith(":en") ? "en" : "ru";
    await upsertBotUser(userId, { language: nextLang });
    await sendSettingsMain(target, nextLang);
    return;
  }
  if (payload === "sutra:set:main") {
    await sendSettingsMain(target, lang);
    return;
  }

  console.warn("settings: unknown payload", payload);
  await sendBotMenu(target, t.unknown, lang);
}