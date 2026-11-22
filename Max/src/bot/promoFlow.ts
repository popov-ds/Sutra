import { redeemPromoCode } from "../db/promo.js";
import { dbEnabled } from "../db/pool.js";
import { isProActive } from "../db/users.js";
import { sendMessage, type MaxInlineButton, type MessageTarget } from "../max/client.js";
import { allMenuLabels, strings, type AppLanguage } from "./i18n.js";
import { clearPromoAwait, isPromoAwait, setPromoAwait } from "./chatSession.js";

export const PROMO_ENTER_PAYLOAD = "sutra:promo:enter";
export const PROMO_CANCEL_PAYLOAD = "sutra:promo:cancel";

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

function promoStepBackRow(lang: AppLanguage): MaxInlineButton[][] {
  return [[{ type: "callback", text: strings(lang).btnBack, payload: PROMO_CANCEL_PAYLOAD }]];
}

export async function handlePromoCallback(target: MessageTarget, lang: AppLanguage): Promise<void> {
  const userId = target.userId;
  if (userId == null) return;
  if (!dbEnabled()) {
    await sendMessage({
      ...target,
      text: strings(lang).promoDbRequired,
      buttons: promoStepBackRow(lang),
    });
    return;
  }
  if (await isProActive(userId)) {
    const { showProInfo } = await import("./billingFlow.js");
    await showProInfo(target, lang);
    return;
  }
  setPromoAwait(userId, true);
  await sendMessage({
    ...target,
    text: strings(lang).promoPrompt,
    buttons: promoStepBackRow(lang),
  });
}

export async function tryHandlePromoMessage(
  userId: number,
  text: string,
  lang: AppLanguage,
  target?: MessageTarget,
): Promise<boolean> {
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
  const deliver: MessageTarget = target ?? { userId };

  if (result.ok) {
    const { showProInfo } = await import("./billingFlow.js");
    await showProInfo(deliver, lang);
    return true;
  }

  await sendMessage({
    ...deliver,
    text: promoResultMessage(lang, result),
    buttons: promoStepBackRow(lang),
  });
  return true;
}

export function clearPromoAwaitForUser(userId: number): void {
  clearPromoAwait(userId);
}