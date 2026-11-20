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