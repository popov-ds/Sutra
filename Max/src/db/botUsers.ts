import fs from "node:fs/promises";
import path from "node:path";
import type { SubscriptionTier } from "../domain/plan.js";
import { config } from "../config.js";

export type BotUser = {
  maxUserId: number;
  language: "ru" | "en";
  tier: SubscriptionTier;
  proExpiresAt: string | null;
  cloudLinked: boolean;
  cloudEmail: string | null;
  dialog: "await_email" | "await_otp" | null;
  otpEmail: string | null;
  updatedAt: string;
};

type StoreFile = { users: Record<string, BotUser> };

function storePath(): string {
  return path.join(config.dataDir, "bot_users.json");
}

async function load(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    return JSON.parse(raw) as StoreFile;
  } catch {
    return { users: {} };
  }
}

async function save(data: StoreFile): Promise<void> {
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.writeFile(storePath(), JSON.stringify(data, null, 2), "utf8");
}

export async function getBotUser(maxUserId: number): Promise<BotUser | null> {
  const data = await load();
  return data.users[String(maxUserId)] ?? null;
}

export async function upsertBotUser(
  maxUserId: number,
  patch: Partial<Pick<BotUser, "language" | "tier" | "proExpiresAt" | "cloudLinked" | "cloudEmail" | "dialog" | "otpEmail">>,
): Promise<BotUser> {
  const data = await load();
  const key = String(maxUserId);
  const prev = data.users[key];
  const now = new Date().toISOString();
  const next: BotUser = {
    maxUserId,
    language: patch.language ?? prev?.language ?? "ru",
    tier: patch.tier ?? prev?.tier ?? "free",
    proExpiresAt: patch.proExpiresAt !== undefined ? patch.proExpiresAt : (prev?.proExpiresAt ?? null),
    cloudLinked: patch.cloudLinked ?? prev?.cloudLinked ?? false,
    cloudEmail: patch.cloudEmail !== undefined ? patch.cloudEmail : (prev?.cloudEmail ?? null),
    dialog: patch.dialog !== undefined ? patch.dialog : (prev?.dialog ?? null),
    otpEmail: patch.otpEmail !== undefined ? patch.otpEmail : (prev?.otpEmail ?? null),
    updatedAt: now,
  };
  data.users[key] = next;
  await save(data);
  return next;
}