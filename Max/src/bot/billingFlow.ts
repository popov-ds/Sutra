import { checkoutUrlForMaxUser } from "../billing/payCheckoutHttp.js";
import { yookassaEnabled } from "../billing/yookassa.js";
import { config } from "../config.js";
import { dbEnabled } from "../db/pool.js";
import { isProActive, proExpiresAt } from "../db/users.js";
import { PLAN_DAYS } from "../domain/billingPlans.js";
import { sendMessage } from "../max/client.js";
import { strings, type AppLanguage } from "./i18n.js";
import { mainMenuKeyboard } from "./keyboard.js";
import { proPromoButtons } from "./promoFlow.js";

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

export async function showProInfo(userId: number, lang: AppLanguage): Promise<void> {
  const t = strings(lang);
  const menu = await mainMenuKeyboard(lang, userId);

  if (!dbEnabled()) {
    await sendMessage({
      userId,
      text: `${t.proNotConfigured}\n\n${t.promoStatusHint}`,
      buttons: menu,
      format: "markdown",
    });
    return;
  }

  const pro = await isProActive(userId);
  let text: string;
  const extra: import("../max/client.js").MaxInlineButton[][] = [];

  if (pro) {
    const exp = await proExpiresAt(userId);
    const until = exp ? formatExpires(exp, lang) : "?";
    text = t.proActive(until);
  } else {
    if (yookassaEnabled() && proPlansConfigured() && config.publicBaseUrl.startsWith("https://")) {
      const url = await checkoutUrlForMaxUser(userId);
      if (url) {
        extra.push([{ type: "link", text: t.btnSubscribePro, url }]);
      }
      text = proOfferText(lang);
    } else {
      text = `${t.proNotConfigured}\n\n${t.promoStatusHint}`;
    }
    extra.push(...proPromoButtons(lang));
  }

  const buttons = pro ? menu : [...extra, ...menu];
  await sendMessage({
    userId,
    text,
    buttons,
    format: "markdown",
  });
}

export async function notifyProActivated(userId: number, expiresAt: Date): Promise<void> {
  const row = await import("../db/users.js").then((m) => m.getUserRow(userId));
  const lang: AppLanguage = row?.language === "en" ? "en" : "ru";
  const t = strings(lang);
  const until = formatExpires(expiresAt, lang);
  await sendMessage({
    userId,
    text: t.proPaidYookassa(until),
    buttons: await mainMenuKeyboard(lang, userId),
  });
}