import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";
import { isProTier } from "../domain/plan.js";
import { getBotUser, upsertBotUser } from "../db/botUsers.js";
import { sendMessage, type MaxInlineButton } from "../max/client.js";
import { strings, type AppLanguage } from "./i18n.js";
import { mainMenuKeyboard } from "./keyboard.js";
import { showProInfo } from "./billingFlow.js";

let supabase: SupabaseClient | null = null;

function sb(): SupabaseClient | null {
  if (!config.supabaseUrl || !config.supabaseAnonKey) return null;
  if (!supabase) supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  return supabase;
}

function inline(buttons: MaxInlineButton[][]): MaxInlineButton[][] {
  return buttons;
}

async function sendInline(userId: number, text: string, buttons: MaxInlineButton[][]): Promise<void> {
  await sendMessage({ userId, text, buttons, format: "markdown" });
}

async function sendMainMenu(userId: number, lang: AppLanguage, text: string): Promise<void> {
  await sendMessage({
    userId,
    text,
    buttons: await mainMenuKeyboard(lang, userId),
    format: "markdown",
  });
}

export async function sendSettingsMain(userId: number, lang?: AppLanguage): Promise<void> {
  const l = lang ?? (await getBotUser(userId))?.language ?? "ru";
  const t = strings(l);
  await sendInline(userId, `**${t.settingsTitle}**`, inline([
    [{ type: "callback", text: t.btnLanguage, payload: "sutra:set:lang" }],
    [{ type: "callback", text: t.btnSubscription, payload: "sutra:set:sub" }],
    [{ type: "callback", text: t.btnBack, payload: "sutra:set:back" }],
  ]));
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
    await sendInline(userId, `**${t.languageTitle}**`, inline([
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
  if (payload === "sutra:set:sub") {
    await sendSubscriptionScreen(userId, lang);
    return;
  }
  if (payload === "sutra:sub:pro") {
    await showProInfo(userId, lang);
    return;
  }
  if (payload === "sutra:cloud:start") {
    await upsertBotUser(userId, { dialog: "await_email", otpEmail: null });
    await sendInline(userId, t.askCloudEmail, inline([[{ type: "callback", text: t.btnBack, payload: "sutra:set:sub" }]]));
    return;
  }
  if (payload === "sutra:cloud:off") {
    await upsertBotUser(userId, { cloudLinked: false, cloudEmail: null, dialog: null, otpEmail: null });
    await sendSubscriptionScreen(userId, lang);
    return;
  }
}

async function sendSubscriptionScreen(userId: number, lang: AppLanguage): Promise<void> {
  const t = strings(lang);
  const user = await upsertBotUser(userId, {});
  if (!isProTier(user.tier)) {
    await sendInline(
      userId,
      `**${t.btnSubscription}**\n\n${t.tariffFree(config.freeRecordLimit)}`,
      inline([
        [{ type: "callback", text: t.btnSubscribePro, payload: "sutra:sub:pro" }],
        [{ type: "callback", text: t.btnBack, payload: "sutra:set:main" }],
      ]),
    );
    return;
  }
  if (!user.cloudLinked) {
    await sendInline(userId, `**${t.btnSubscription}** (Pro)\n\n${t.cloudNotLinked}`, inline([
      [{ type: "callback", text: t.btnCloudAccount, payload: "sutra:cloud:start" }],
      [{ type: "callback", text: t.btnBack, payload: "sutra:set:main" }],
    ]));
    return;
  }
  const email = user.cloudEmail ? `\n${user.cloudEmail}` : "";
  await sendInline(userId, `**${t.btnSubscription}** (Pro)${email}\n\n${t.cloudLinkedHint}`, inline([
    [{ type: "callback", text: t.btnCloudDisconnect, payload: "sutra:cloud:off" }],
    [{ type: "callback", text: t.btnBack, payload: "sutra:set:main" }],
  ]));
}

export async function tryHandleDialogMessage(userId: number, text: string): Promise<boolean> {
  const user = await getBotUser(userId);
  if (!user?.dialog) return false;
  const lang = user.language;
  const t = strings(lang);
  const trimmed = text.trim();

  if (user.dialog === "await_email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      await sendMessage({ userId, text: t.invalidEmail });
      return true;
    }
    const client = sb();
    if (!client) {
      await sendMessage({ userId, text: t.supabaseMissing });
      return true;
    }
    const { error } = await client.auth.signInWithOtp({ email: trimmed });
    if (error) {
      await sendMessage({ userId, text: `${t.otpSendFailed}\n${error.message}` });
      return true;
    }
    await upsertBotUser(userId, { dialog: "await_otp", otpEmail: trimmed });
    await sendMessage({ userId, text: t.otpSent(trimmed) });
    return true;
  }

  if (user.dialog === "await_otp" && user.otpEmail) {
    const client = sb();
    if (!client) {
      await sendMessage({ userId, text: t.supabaseMissing });
      return true;
    }
    const { error } = await client.auth.verifyOtp({ email: user.otpEmail, token: trimmed, type: "email" });
    if (error) {
      await sendMessage({ userId, text: t.otpInvalid });
      return true;
    }
    await upsertBotUser(userId, {
      cloudLinked: true,
      cloudEmail: user.otpEmail,
      dialog: null,
      otpEmail: null,
    });
    await sendSubscriptionScreen(userId, lang);
    return true;
  }

  return false;
}