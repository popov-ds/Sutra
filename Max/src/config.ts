import "dotenv/config";
import { parsePromoCodesEnv } from "./config/promoCodes.js";

function required(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const config = {
  maxBotToken: process.env.MAX_BOT_TOKEN?.trim() ?? "",
  /** Публичное имя бота в MAX для open_app (не URL). */
  maxBotWebApp: process.env.MAX_BOT_WEB_APP?.trim() ?? "",
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? "").trim().replace(/\/$/, ""),
  httpPort: Number(process.env.HTTP_PORT ?? "8090"),
  webhookSecret: process.env.WEBHOOK_SECRET?.trim() ?? "",
  usePolling: (process.env.MAX_USE_POLLING ?? "1").trim() === "1",
  launchTokenSecret: process.env.LAUNCH_TOKEN_SECRET?.trim() ?? "",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
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