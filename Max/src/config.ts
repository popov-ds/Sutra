import "dotenv/config";
import { parsePromoCodesEnv } from "./config/promoCodes.js";

function required(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/** Публичный URL формы: SUPPORT_PUBLIC_URL или PUBLIC_BASE_URL/support. */
function resolveSupportPublicUrl(): string {
  const direct = process.env.SUPPORT_PUBLIC_URL?.trim() ?? "";
  if (direct) return direct.replace(/\/$/, "");
  const base = (process.env.PUBLIC_BASE_URL ?? "").trim().replace(/\/$/, "");
  if (base.startsWith("https://")) return `${base}/support`;
  return "";
}

export const config = {
  maxBotToken: process.env.MAX_BOT_TOKEN?.trim() ?? "",
  /** Публичное имя бота в MAX для open_app (не URL). */
  maxBotWebApp: process.env.MAX_BOT_WEB_APP?.trim() ?? "",
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? "").trim().replace(/\/$/, ""),
  supportPublicUrl: resolveSupportPublicUrl(),
  httpPort: Number(process.env.HTTP_PORT ?? "8090"),
  webhookSecret: process.env.WEBHOOK_SECRET?.trim() ?? "",
  usePolling: (process.env.MAX_USE_POLLING ?? "1").trim() === "1",
  launchTokenSecret: process.env.LAUNCH_TOKEN_SECRET?.trim() ?? "",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  /** Только на сервере: утренний дайджест касаний из Supabase */
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
  morningDigestEnabled: (process.env.MORNING_DIGEST_ENABLED ?? "1").trim() !== "0",
  morningDigestTz: (process.env.MORNING_DIGEST_TZ ?? "Europe/Moscow").trim(),
  morningDigestHour: Math.min(23, Math.max(0, Number(process.env.MORNING_DIGEST_HOUR ?? "9") || 9)),
  dataDir: process.env.DATA_DIR?.trim() || "data",
  databaseUrl: process.env.DATABASE_URL?.trim() ?? "",
  postgresPassword: process.env.POSTGRES_PASSWORD?.trim() ?? "",
  promoCodes: parsePromoCodesEnv(process.env.PROMO_CODES ?? ""),
  freeRecordLimit: 10,
  yookassaShopId: process.env.YOOKASSA_SHOP_ID?.trim() ?? "",
  yookassaSecretKey: process.env.YOOKASSA_SECRET_KEY?.trim() ?? "",
  /** Суммы с копейками, например 299.00 */
  proMonthRub: process.env.PRO_MONTH_RUB?.trim() ?? "",
  proYearRub: process.env.PRO_YEAR_RUB?.trim() ?? "",
  /** Чек в теле платежа (если в кабинете включены чеки 54-ФЗ). 0 — не слать receipt */
  yookassaFiscalization: (process.env.YOOKASSA_FISCALIZATION ?? "1").trim() !== "0",
  /** Код НДС в чеке: 1 — без НДС (типично УСН) */
  yookassaVatCode: Number(process.env.YOOKASSA_VAT_CODE ?? "1") || 1,
  /** Запасной email покупателя для чека, если нет cloud_email и поля на странице */
  yookassaDefaultReceiptEmail: process.env.YOOKASSA_DEFAULT_RECEIPT_EMAIL?.trim() ?? "",
};

export function assertBotReady(): void {
  required("MAX_BOT_TOKEN", config.maxBotToken);
  if (!config.launchTokenSecret) {
    throw new Error("Missing env: LAUNCH_TOKEN_SECRET");
  }
}

export function miniAppConfigured(): boolean {
  return config.publicBaseUrl.startsWith("https://");
}