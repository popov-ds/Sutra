import { redeemPromoCode } from "../db/promo.js";
import { dbEnabled } from "../db/pool.js";
import { isProActive } from "../db/users.js";
import { sendMessage, type MaxInlineButton } from "../max/client.js";
import { allMenuLabels, strings, type AppLanguage } from "./i18n.js";
import { mainMenuKeyboard } from "./keyboard.js";
import { clearPromoAwait, isPromoAwait, setPromoAwait } from "./chatSession.js";

export const PROMO_ENTER_PAYLOAD = "sutra:promo:enter";

const MENU_LABELS = allMenuLabels();

function formatExpires(d: Date, lang: AppLanguage): string {
  const locale = lang === "en" ? "en-US" : "ru-RU";
  return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

function promoResultMessage(lang: AppLanguage, result: Awaited<ReturnType<typeof redeemPromoCode>>): string {
  const t = strings(lang);
  if (result.ok) return t.promoOk(result.days, formatExpires(result.expiresAt, lang));
  if (result.reason === "unknown") return t.promoUnknown;
  if (result.reason === "used") return t.promoUsed;
  if (result.reason === "exhausted") return t.promoExhausted;
  return t.promoInvalid;
}

export function proPromoButtons(lang: AppLanguage): MaxInlineButton[][] {
  const t = strings(lang);
  return [[{ type: "callback", text: t.promoButton, payload: PROMO_ENTER_PAYLOAD }]];
}

export async function handlePromoCallback(userId: number, lang: AppLanguage): Promise<void> {
  if (!dbEnabled()) {
    await sendMessage({
      userId,
      text: strings(lang).promoDbRequired,
      buttons: await mainMenuKeyboard(lang, userId),
    });
    return;
  }
  if (await isProActive(userId)) {
    await sendMessage({
      userId,
      text: strings(lang).promoAlreadyPro,
      buttons: await mainMenuKeyboard(lang, userId),
    });
    return;
  }
  setPromoAwait(userId, true);
  await sendMessage({
    userId,
    text: strings(lang).promoPrompt,
    buttons: [[{ type: "callback", text: strings(lang).btnBack, payload: "sutra:promo:cancel" }]],
  });
}

export async function tryHandlePromoMessage(userId: number, text: string, lang: AppLanguage): Promise<boolean> {
  if (!isPromoAwait(userId)) return false;

  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("/") || MENU_LABELS.has(trimmed)) {
    clearPromoAwait(userId);
    return false;
  }

  if (!dbEnabled()) {
    clearPromoAwait(userId);
    return false;
  }

  clearPromoAwait(userId);
  const result = await redeemPromoCode(userId, trimmed);
  await sendMessage({
    userId,
    text: promoResultMessage(lang, result),
    buttons: await mainMenuKeyboard(lang, userId),
  });
  return true;
}

export async function cancelPromoDialog(userId: number, lang: AppLanguage): Promise<void> {
  clearPromoAwait(userId);
  await sendMessage({
    userId,
    text: strings(lang).menuRestored,
    buttons: await mainMenuKeyboard(lang, userId),
  });
}