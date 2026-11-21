import type { ServerResponse } from "node:http";
import { createYooPayment, yookassaEnabled, yooErrorHint } from "./yookassa.js";
import { config } from "../config.js";
import { issuePayCheckoutToken, verifyPayCheckoutToken } from "./payCheckoutToken.js";
import type { ProPlanId } from "../domain/billingPlans.js";
import { isProPlanId } from "../domain/billingPlans.js";
import { isProActive, getUserRow } from "../db/users.js";
import type { AppLanguage } from "../bot/i18n.js";

function html(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

function redirect(res: ServerResponse, location: string): void {
  res.writeHead(302, { Location: location, "Cache-Control": "no-store" });
  res.end();
}

export function publicPayStartUrl(token: string): string {
  const base = config.publicBaseUrl.replace(/\/$/, "");
  return `${base}/pay/start?token=${encodeURIComponent(token)}`;
}

function payGoUrl(token: string, plan: ProPlanId): string {
  const base = config.publicBaseUrl.replace(/\/$/, "");
  return `${base}/pay/go?token=${encodeURIComponent(token)}&plan=${plan}`;
}

function planTitle(plan: ProPlanId, lang: AppLanguage): string {
  if (lang === "en") return plan === "pro_month" ? "Sutra Pro — 1 month" : "Sutra Pro — 1 year";
  return plan === "pro_month" ? "Sutra Pro — 1 месяц" : "Sutra Pro — 1 год";
}

function pageShell(lang: AppLanguage, title: string, inner: string): string {
  const dir = lang === "ru" ? "ru" : "en";
  return `<!DOCTYPE html>
<html lang="${dir}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px 16px; background: #f4f6f8; color: #1a1a1a; }
    .card { max-width: 420px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    h1 { font-size: 1.25rem; margin: 0 0 8px; }
    p { margin: 0 0 12px; line-height: 1.45; color: #444; }
    .muted { font-size: .9rem; color: #666; }
    .plans { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
    .plan { display: block; width: 100%; text-align: center; text-decoration: none; padding: 14px 16px; border-radius: 10px; background: #0f6e6b; color: #fff; font-weight: 600; border: none; font: inherit; cursor: pointer; }
    .plan.secondary { background: #fff; color: #0f6e6b; border: 2px solid #0f6e6b; }
    form.plans { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
    .note { margin-top: 16px; padding-top: 12px; border-top: 1px solid #eee; }
    .field-label { display: block; font-size: .9rem; margin: 12px 0 8px; color: #444; }
    .field-label input { display: block; width: 100%; margin-top: 6px; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font: inherit; }
    .pay-err-detail { font-size: .85rem; color: #8a2a2a; margin-top: 8px; word-break: break-word; }
  </style>
</head>
<body><div class="card">${inner}</div></body>
</html>`;
}

function strings(lang: AppLanguage) {
  if (lang === "en") {
    return {
      title: "Sutra Pro",
      intro: "Payment on our secure site (outside MAX). Pro activates automatically after payment.",
      alreadyPro: "Pro is already active. Return to the MAX bot.",
      month: "Pro — 1 month",
      year: "Pro — 1 year",
      notConfigured: "Payments are not configured on this server.",
      invalidLink: "This payment link has expired. Open «Pro» in the bot again.",
      processing: "Redirecting to payment…",
      returnOk:
        "Payment received. Pro will activate in a moment — check the bot («Plan»). You can close this page.",
    };
  }
  return {
    title: "Sutra Pro",
    intro: "Оплата на защищённой странице (вне MAX). После оплаты Pro включится автоматически.",
    alreadyPro: "Pro уже активен. Вернитесь в чат с ботом MAX.",
    month: "Pro — 1 месяц",
    year: "Pro — 1 год",
    notConfigured: "Оплата на сервере не настроена.",
    invalidLink: "Ссылка устарела. Снова откройте «Pro» в боте.",
    processing: "Переход к оплате…",
    returnOk:
      "Оплата получена. Pro включится через несколько секунд — проверьте бота («Тариф»). Страницу можно закрыть.",
  };
}

export function renderPayReturnPage(lang: AppLanguage): string {
  const s = strings(lang);
  return pageShell(lang, s.title, `<h1>${s.title}</h1><p>${s.returnOk}</p>`);
}

async function userLang(maxUserId: number): Promise<AppLanguage> {
  const row = await getUserRow(maxUserId);
  return row?.language === "en" ? "en" : "ru";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function knownReceiptEmail(maxUserId: number): Promise<string | null> {
  const row = await getUserRow(maxUserId);
  const cloud = row?.cloud_email?.trim();
  if (cloud?.includes("@")) return cloud;
  const def = config.yookassaDefaultReceiptEmail.trim();
  if (def.includes("@")) return def;
  return null;
}

function plansWithFiscalForm(
  token: string,
  lang: AppLanguage,
  s: ReturnType<typeof strings>,
  presetEmail: string,
): string {
  const label = lang === "en" ? "Email for payment receipt (54-FZ)" : "Email для чека (54-ФЗ)";
  const hint = lang === "en" ? "Required for YooKassa." : "Нужен для ЮKassa.";
  const buttons: string[] = [];
  if (config.proMonthRub) {
    buttons.push(
      `<button type="submit" class="plan" name="plan" value="pro_month">${escapeHtml(s.month)} — ${escapeHtml(config.proMonthRub)} ₽</button>`,
    );
  }
  if (config.proYearRub) {
    buttons.push(
      `<button type="submit" class="plan secondary" name="plan" value="pro_year">${escapeHtml(s.year)} — ${escapeHtml(config.proYearRub)} ₽</button>`,
    );
  }
  return `<form class="plans" method="GET" action="/pay/go" accept-charset="UTF-8">
    <input type="hidden" name="token" value="${escapeHtml(token)}" />
    <label class="field-label">${escapeHtml(label)}
      <span class="muted">${escapeHtml(hint)}</span>
      <input type="email" name="receipt_email" autocomplete="email" required value="${escapeHtml(presetEmail)}" />
    </label>
    ${buttons.join("")}
  </form>`;
}

function plansAsLinks(token: string, s: ReturnType<typeof strings>): string {
  const plans: string[] = [];
  if (config.proMonthRub) {
    plans.push(
      `<a class="plan" href="${payGoUrl(token, "pro_month")}">${escapeHtml(s.month)} — ${escapeHtml(config.proMonthRub)} ₽</a>`,
    );
  }
  if (config.proYearRub) {
    plans.push(
      `<a class="plan secondary" href="${payGoUrl(token, "pro_year")}">${escapeHtml(s.year)} — ${escapeHtml(config.proYearRub)} ₽</a>`,
    );
  }
  return `<div class="plans">${plans.join("")}</div>`;
}

async function renderPayStart(token: string, res: ServerResponse): Promise<void> {
  const maxUserId = verifyPayCheckoutToken(token);
  if (!maxUserId) {
    html(res, 400, pageShell("ru", "Pro", `<p>${strings("ru").invalidLink}</p>`));
    return;
  }
  const lang = await userLang(maxUserId);
  const s = strings(lang);

  if (await isProActive(maxUserId)) {
    html(res, 200, pageShell(lang, s.title, `<h1>${s.title}</h1><p>${s.alreadyPro}</p>`));
    return;
  }

  if (!yookassaEnabled() || (!config.proMonthRub && !config.proYearRub)) {
    html(res, 503, pageShell(lang, s.title, `<h1>${s.title}</h1><p>${s.notConfigured}</p>`));
    return;
  }

  const presetEmail = (await knownReceiptEmail(maxUserId)) ?? "";
  const plansBlock = config.yookassaFiscalization
    ? plansWithFiscalForm(token, lang, s, presetEmail)
    : plansAsLinks(token, s);

  html(
    res,
    200,
    pageShell(
      lang,
      s.title,
      `<h1>${s.title}</h1><p>${s.intro}</p>${plansBlock}<p class="note muted">${lang === "en" ? "Promo codes — in the MAX bot chat." : "Промокоды — в чате с ботом."}</p>`,
    ),
  );
}

async function handlePayGo(
  token: string,
  planRaw: string,
  receiptEmailRaw: string,
  res: ServerResponse,
): Promise<void> {
  const maxUserId = verifyPayCheckoutToken(token);
  if (!maxUserId) {
    html(res, 400, pageShell("ru", "Pro", `<p>${strings("ru").invalidLink}</p>`));
    return;
  }
  if (!isProPlanId(planRaw)) {
    html(res, 400, pageShell("ru", "Pro", `<p>Invalid plan</p>`));
    return;
  }
  const plan = planRaw;
  const lang = await userLang(maxUserId);
  const s = strings(lang);

  if (await isProActive(maxUserId)) {
    html(res, 200, pageShell(lang, s.title, `<h1>${s.title}</h1><p>${s.alreadyPro}</p>`));
    return;
  }

  const rub = plan === "pro_month" ? config.proMonthRub : config.proYearRub;
  if (!yookassaEnabled() || !rub) {
    html(res, 503, pageShell(lang, s.title, `<p>${s.notConfigured}</p>`));
    return;
  }

  let receiptEmail =
    receiptEmailRaw.trim() ||
    (await knownReceiptEmail(maxUserId)) ||
    config.yookassaDefaultReceiptEmail.trim() ||
    "";

  if (config.yookassaFiscalization && !receiptEmail.includes("@")) {
    redirect(res, `/pay/start?token=${encodeURIComponent(token)}`);
    return;
  }

  try {
    const payment = await createYooPayment({
      maxUserId,
      plan,
      amountRub: rub,
      description: planTitle(plan, lang),
      customerEmail: receiptEmail || null,
    });
    const url = payment.confirmation?.confirmation_url;
    if (!url) throw new Error("No confirmation URL");
    redirect(res, url);
  } catch (err) {
    console.error("pay/go:", err);
    const hint = yooErrorHint(err);
    const detail = hint ? `<p class="pay-err-detail">${escapeHtml(hint)}</p>` : "";
    html(
      res,
      500,
      pageShell(
        lang,
        s.title,
        `<p>${lang === "en" ? "Could not start payment." : "Не удалось начать оплату."}</p>${detail}`,
      ),
    );
  }
}

export async function handlePayCheckoutHttp(
  method: string,
  pathOnly: string,
  queryString: string,
  res: ServerResponse,
): Promise<boolean> {
  if (method !== "GET") return false;

  if (pathOnly === "/pay/return") {
    const q = new URLSearchParams(queryString);
    const lang = q.get("lang") === "en" ? "en" : "ru";
    html(res, 200, renderPayReturnPage(lang));
    return true;
  }

  if (pathOnly === "/pay/start") {
    const token = new URLSearchParams(queryString).get("token")?.trim() ?? "";
    await renderPayStart(token, res);
    return true;
  }

  if (pathOnly === "/pay/go") {
    const q = new URLSearchParams(queryString);
    const token = q.get("token")?.trim() ?? "";
    const plan = q.get("plan")?.trim() ?? "";
    const receiptEmail = q.get("receipt_email")?.trim() ?? "";
    await handlePayGo(token, plan, receiptEmail, res);
    return true;
  }

  return false;
}

export async function checkoutUrlForMaxUser(maxUserId: number): Promise<string | null> {
  if (!config.publicBaseUrl.startsWith("https://")) return null;
  if (!yookassaEnabled()) return null;
  if (!config.proMonthRub && !config.proYearRub) return null;
  const token = issuePayCheckoutToken(maxUserId);
  return publicPayStartUrl(token);
}