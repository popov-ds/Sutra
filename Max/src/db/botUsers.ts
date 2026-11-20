import fs from "node:fs/promises";
import path from "node:path";
import type { AppLanguage } from "../bot/i18n.js";
import type { SubscriptionTier } from "../domain/plan.js";
import { config } from "../config.js";
import { dbEnabled } from "./pool.js";
import { ensureBotUser, getUserRow, isProActive, patchUser, proExpiresAt } from "./users.js";

export type BotUser = {
  maxUserId: number;
  language: AppLanguage;
  tier: SubscriptionTier;
  proExpiresAt: string | null;
  cloudEmail: string | null;
  updatedAt: string;
};

type StoreFile = { users: Record<string, Omit<BotUser, "maxUserId">> };

function storePath(): string {
  return path.join(config.dataDir, "bot_users.json");
}

async function loadJson(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    return JSON.parse(raw) as StoreFile;
  } catch {
    return { users: {} };
  }
}

async function saveJson(data: StoreFile): Promise<void> {
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.writeFile(storePath(), JSON.stringify(data, null, 2), "utf8");
}

function langOf(v: string | undefined): AppLanguage {
  return v === "en" ? "en" : "ru";
}

async function getBotUserPg(maxUserId: number): Promise<BotUser | null> {
  await ensureBotUser(maxUserId);
  const row = await getUserRow(maxUserId);
  if (!row) return null;
  const pro = await isProActive(maxUserId);
  const exp = await proExpiresAt(maxUserId);
  return {
    maxUserId,
    language: langOf(row.language),
    tier: pro ? "pro" : "free",
    proExpiresAt: exp?.toISOString() ?? null,
    cloudEmail: row.cloud_email?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
}

export async function getBotUser(maxUserId: number): Promise<BotUser | null> {
  if (dbEnabled()) return getBotUserPg(maxUserId);
  const data = await loadJson();
  const u = data.users[String(maxUserId)];
  if (!u) return null;
  return {
    maxUserId,
    language: langOf(u.language),
    tier: u.tier ?? "free",
    proExpiresAt: u.proExpiresAt ?? null,
    cloudEmail: u.cloudEmail ?? null,
    updatedAt: u.updatedAt ?? new Date().toISOString(),
  };
}

export async function upsertBotUser(
  maxUserId: number,
  patch: Partial<Pick<BotUser, "language" | "cloudEmail">>,
): Promise<BotUser> {
  if (dbEnabled()) {
    await ensureBotUser(maxUserId, patch.language ?? "ru");
    await patchUser(maxUserId, {
      language: patch.language,
      cloudEmail: patch.cloudEmail,
    });
    return (await getBotUserPg(maxUserId))!;
  }

  const data = await loadJson();
  const key = String(maxUserId);
  const prev = data.users[key];
  const now = new Date().toISOString();
  const proTier = prev?.tier === "pro";
  const next = {
    language: patch.language ?? prev?.language ?? "ru",
    tier: proTier ? ("pro" as const) : ("free" as const),
    proExpiresAt: prev?.proExpiresAt ?? null,
    cloudEmail: patch.cloudEmail !== undefined ? patch.cloudEmail : (prev?.cloudEmail ?? null),
    updatedAt: now,
  };
  data.users[key] = next;
  await saveJson(data);
  return { maxUserId, ...next };
}