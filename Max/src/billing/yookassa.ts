import { randomUUID } from "node:crypto";
import type { ProPlanId } from "../domain/billingPlans.js";
import { config } from "../config.js";

export type YooPayment = {
  id: string;
  status: string;
  confirmation?: { confirmation_url?: string };
  metadata?: Record<string, string>;
};

export type YooWebhookEvent = {
  event: string;
  object: YooPayment;
};

function authHeader(): string {
  const id = config.yookassaShopId;
  const secret = config.yookassaSecretKey;
  if (!id || !secret) throw new Error("YooKassa is not configured");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export function yookassaEnabled(): boolean {
  return Boolean(config.yookassaShopId && config.yookassaSecretKey);
}

/** ЮKassa ждёт строку с двумя знаками после запятой: 299.00 */
export function formatRubAmount(raw: string): string {
  const cleaned = raw.trim().replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0.01) throw new Error(`Invalid amount: ${raw}`);
  return n.toFixed(2);
}

export function yooErrorHint(err: unknown): string {
  if (!(err instanceof Error)) return "";
  const m = err.message;
  const idx = m.indexOf("{");
  if (idx < 0) return m.length <= 240 ? m : `${m.slice(0, 240)}…`;
  try {
    const j = JSON.parse(m.slice(idx)) as {
      description?: string;
      code?: string;
      parameter?: string;
    };
    const parts = [j.code, j.parameter, j.description].filter((x) => x && String(x).trim());
    return parts.join(" — ").slice(0, 320);
  } catch {
    return "";
  }
}

function buildReceipt(amountRub: string, description: string, customerEmail: string) {
  return {
    customer: { email: customerEmail },
    items: [
      {
        description: description.slice(0, 128),
        quantity: "1.00",
        amount: { value: amountRub, currency: "RUB" },
        vat_code: config.yookassaVatCode,
        payment_mode: "full_payment",
        payment_subject: "service",
      },
    ],
  };
}

export type CreateYooPaymentInput = {
  maxUserId: number;
  plan: ProPlanId;
  amountRub: string;
  description: string;
  customerEmail?: string | null;
};

export async function createYooPayment(input: CreateYooPaymentInput): Promise<YooPayment> {
  const { maxUserId, plan, description, customerEmail } = input;
  const amountValue = formatRubAmount(input.amountRub);

  const returnBase = config.publicBaseUrl.replace(/\/$/, "");
  if (!returnBase.startsWith("https://")) {
    throw new Error("PUBLIC_BASE_URL must be https for YooKassa return_url");
  }
  const returnUrl = `${returnBase}/pay/return`;

  const body: Record<string, unknown> = {
    amount: { value: amountValue, currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: returnUrl },
    description: description.slice(0, 128),
    metadata: {
      max_user_id: String(maxUserId),
      plan,
    },
  };

  if (config.yookassaFiscalization) {
    const email = customerEmail?.trim() || config.yookassaDefaultReceiptEmail?.trim() || "";
    if (!email || !email.includes("@")) {
      throw new Error("Receipt email is required (54-FZ). Enter email on the plan page or set YOOKASSA_DEFAULT_RECEIPT_EMAIL.");
    }
    body.receipt = buildReceipt(amountValue, description, email);
  }

  const res = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      "Idempotence-Key": randomUUID(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YooKassa ${res.status}: ${text}`);
  }
  return (await res.json()) as YooPayment;
}