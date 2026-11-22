import { checkoutUrlForMaxUser } from "../billing/payCheckoutHttp.js";
import { yookassaEnabled } from "../billing/yookassa.js";
import { config } from "../config.js";
import { getBotUser } from "../db/botUsers.js";
import { dbEnabled } from "../db/pool.js";
import { isProActive, proExpiresAt } from "../db/users.js";
import { PLAN_DAYS } from "../domain/billingPlans.js";
import { sendMessage, type MaxInlineButton, type MessageTarget } from "../max/client.js";
import { strings, type AppLanguage } from "./i18n.js";
import { proPromoButtons } from "./promoFlow.js";
import { sendBotMenu } from "./sendMenu.js";

export const PRO_BACK_PAYLOAD = "sutra:pro:back";

function formatExpires(d: Date, lang: AppLanguage): string {
  const locale = lang === "en" ? "en-US" : "ru-RU";
  return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

function proPlansConfigured(): boolean {
  return Boolean(config.proMonthRub || config.proYearRub);
}

function proOfferText(lang: AppLanguage): string {
  const t = strings(lang);
  const lines: string[] = [t.proOfferLead];
  if (config.proMonthRub) {
    lines.push(t.proOfferMonth(config.proMonthRub, PLAN_DAYS.pro_month));
  }
  if (config.proYearRub) {
    lines.push(t.proOfferYear(config.proYearRub, PLAN_DAYS.pro_year));
  }
  if (yookassaEnabled() && proPlansConfigured()) {
    lines.push(t.proPayWeb);
  }
  lines.push(t.promoStatusHint);
  return lines.join("\n");
}

async function sendProInline(
  target: MessageTarget,
  text: string,
  buttons: MaxInlineButton[][],
): Promise<void> {
  await sendMessage({ ...target, text, buttons });
}

function proSubmenuRows(
  lang: AppLanguage,
  options: { payUrl?: string | null; showPromo?: boolean },
): MaxInlineButton[][] {
  const t = strings(lang);
  const rows: MaxInlineButton[][] = [];
  if (options.payUrl) {
    rows.push([{ type: "link", text: t.btnSubscribePro, url: options.payUrl }]);
  }
  if (options.showPromo) {
    rows.push(...proPromoButtons(lang));
  }
  rows.push([{ type: "callback", text: t.btnBack, payload: PRO_BACK_PAYLOAD }]);
  return rows;
}

export async function showProInfo(target: MessageTarget, lang: AppLanguage): Promise<void> {
  const userId = target.userId;
  if (userId == null) return;
  const t = strings(lang);

  try {
    if (!dbEnabled()) {
      await sendProInline(target, `${t.proNotConfigured}\n\n${t.promoStatusHint}`, proSubmenuRows(lang, {}));
      return;
    }

    const pro = await isProActive(userId);
    if (pro) {
      const exp = await proExpiresAt(userId);
      const until = exp ? formatExpires(exp, lang) : "?";
      await sendProInline(target, t.proActive(until), proSubmenuRows(lang, {}));
      return;
    }

    let text: string;
    let payUrl: string | null = null;
    if (yookassaEnabled() && proPlansConfigured() && config.publicBaseUrl.startsWith("https://")) {
      payUrl = await checkoutUrlForMaxUser(userId);
      text = proOfferText(lang);
    } else {
      text = `${t.proNotConfigured}\n\n${t.promoStatusHint}`;
    }
    await sendProInline(target, text, proSubmenuRows(lang, { payUrl, showPromo: true }));
  } catch (err) {
    console.error("showProInfo:", err);
    await sendBotMenu(target, t.botTempError, lang);
  }
}

export async function handleProCallback(target: MessageTarget, payload: string): Promise<void> {
  const userId = target.userId;
  if (userId == null) return;
  const lang = (await getBotUser(userId))?.language ?? "ru";
  const t = strings(lang);
  if (payload === PRO_BACK_PAYLOAD) {
    await sendBotMenu(target, t.menuRestored, lang);
    return;
  }
  console.warn("pro: unknown payload", payload);
  await showProInfo(target, lang);
}

export async function notifyProActivated(userId: number, expiresAt: Date): Promise<void> {
  const row = await import("../db/users.js").then((m) => m.getUserRow(userId));
  const lang: AppLanguage = row?.language === "en" ? "en" : "ru";
  const t = strings(lang);
  const until = formatExpires(expiresAt, lang);
  await sendBotMenu({ userId }, t.proPaidYookassa(until), lang);
}