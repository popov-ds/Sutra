import crypto from "node:crypto";
import { config } from "../config.js";

const MAX_AUTH_AGE_SEC = 86400;

export type MaxWebAppUser = {
  maxUserId: number;
  authDate: number;
};

/** Проверка initData по https://dev.max.ru/docs/webapps/validation */
export function validateMaxInitData(appData: string, botToken?: string): MaxWebAppUser | null {
  const token = (botToken ?? config.maxBotToken).trim();
  const raw = appData.trim();
  if (!raw || !token) return null;

  const pairs: [string, string][] = [];
  for (const part of raw.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq);
    const value = decodeURIComponent(part.slice(eq + 1));
    pairs.push([key, value]);
  }

  const hashEntries = pairs.filter(([k]) => k === "hash");
  if (hashEntries.length !== 1) return null;
  const originalHash = hashEntries[0]![1];
  if (!originalHash) return null;

  const sorted = pairs
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => a.localeCompare(b));
  const launchParams = sorted.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const calculated = crypto.createHmac("sha256", secretKey).update(launchParams).digest("hex");

  const got = originalHash.toLowerCase();
  const want = calculated.toLowerCase();
  if (want.length !== got.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(want), Buffer.from(got))) return null;

  let authDate = 0;
  let maxUserId = 0;
  for (const [k, v] of pairs) {
    if (k === "auth_date") authDate = Number(v);
    if (k === "user") {
      try {
        const user = JSON.parse(v) as { id?: number; user_id?: number };
        const uid = user.id ?? user.user_id;
        if (uid && Number.isFinite(uid)) maxUserId = uid;
      } catch {
        return null;
      }
    }
  }
  if (!maxUserId || !Number.isFinite(authDate)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (authDate <= 0 || now - authDate > MAX_AUTH_AGE_SEC) return null;

  return { maxUserId, authDate };
}