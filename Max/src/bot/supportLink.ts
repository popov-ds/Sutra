import type { AppLanguage } from "./i18n.js";
import { config } from "../config.js";

export function supportConfigured(): boolean {
  return config.supportPublicUrl.trim().startsWith("https://");
}

export function supportFormUrl(maxUserId: number, lang: AppLanguage): string {
  const base = config.supportPublicUrl.replace(/\/$/, "");
  const url = new URL(`${base}/`);
  url.searchParams.set("source", "Max");
  url.searchParams.set("product_id", "Sutra");
  url.searchParams.set("user_id", String(maxUserId));
  url.searchParams.set("lang", lang);
  return url.toString();
}