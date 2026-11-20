import { getBotUser, upsertBotUser } from "../db/botUsers.js";
import { sendMessage, type MaxInlineButton } from "../max/client.js";
import { strings, type AppLanguage } from "./i18n.js";
import { mainMenuKeyboard } from "./keyboard.js";

function inline(buttons: MaxInlineButton[][]): MaxInlineButton[][] {
  return buttons;
}

async function sendInline(userId: number, text: string, buttons: MaxInlineButton[][]): Promise<void> {
  await sendMessage({ userId, text, buttons });
}

async function sendMainMenu(userId: number, lang: AppLanguage, text: string): Promise<void> {
  await sendMessage({
    userId,
    text,
    buttons: mainMenuKeyboard(lang, userId),
  });
}

export async function sendSettingsMain(userId: number, lang?: AppLanguage): Promise<void> {
  try {
    await upsertBotUser(userId, {});
    const user = await getBotUser(userId);
    const l = lang ?? user?.language ?? "ru";
    const t = strings(l);
    await sendInline(userId, t.settingsTitle, inline([
      [{ type: "callback", text: t.btnLanguage, payload: "sutra:set:lang" }],
      [{ type: "callback", text: t.btnBack, payload: "sutra:set:back" }],
    ]));
  } catch (err) {
    const l = lang ?? "ru";
    const t = strings(l);
    console.error("sendSettingsMain:", err);
    await sendMessage({
      userId,
      text: `${t.settingsTitle}\n\n${t.botTempError}`,
      buttons: mainMenuKeyboard(l, userId),
    });
  }
}

export async function handleSettingsCallback(userId: number, payload: string): Promise<void> {
  const user = await upsertBotUser(userId, {});
  const lang = user.language;
  const t = strings(lang);

  if (payload === "sutra:set:back") {
    await sendMainMenu(userId, lang, t.menuRestored);
    return;
  }
  if (payload === "sutra:set:lang") {
    await sendInline(userId, t.languageTitle, inline([
      [{ type: "callback", text: t.langRu, payload: "sutra:lang:ru" }],
      [{ type: "callback", text: t.langEn, payload: "sutra:lang:en" }],
      [{ type: "callback", text: t.btnBack, payload: "sutra:set:main" }],
    ]));
    return;
  }
  if (payload === "sutra:lang:ru" || payload === "sutra:lang:en") {
    const nextLang = payload.endsWith(":en") ? "en" : "ru";
    await upsertBotUser(userId, { language: nextLang });
    await sendSettingsMain(userId, nextLang);
    return;
  }
  if (payload === "sutra:set:main") {
    await sendSettingsMain(userId, lang);
    return;
  }

  console.warn("settings: unknown payload", payload);
  await sendMessage({ userId, text: t.unknown, buttons: mainMenuKeyboard(lang, userId) });
}