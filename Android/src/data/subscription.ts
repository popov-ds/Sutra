import type { SQLiteDatabase } from 'expo-sqlite';

import { FREE_RECORD_LIMIT, isProTier, type SubscriptionTier } from '@/domain/plan';
import { DomainError } from '@/domain/errors';
import { enqueueWrite } from '@/db/queue';

import { ensureSettingsTable } from './settings';

const TIER_KEY = 'subscription_tier';

let cachedTier: SubscriptionTier = 'free';

export function peekSubscriptionTier(): SubscriptionTier {
  return cachedTier;
}

export function rememberSubscriptionTier(tier: SubscriptionTier): void {
  cachedTier = tier;
}

function parseTier(value: string | undefined): SubscriptionTier {
  return value === 'pro' ? 'pro' : 'free';
}

export async function loadSubscriptionTier(db: SQLiteDatabase): Promise<SubscriptionTier> {
  await ensureSettingsTable(db);
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    TIER_KEY,
  );
  const tier = parseTier(row?.value);
  rememberSubscriptionTier(tier);
  return tier;
}

export function saveSubscriptionTier(db: SQLiteDatabase, tier: SubscriptionTier): Promise<void> {
  rememberSubscriptionTier(tier);
  return enqueueWrite(db, async () => {
    await ensureSettingsTable(db);
    await db.runAsync(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      TIER_KEY,
      tier,
    );
  });
}

async function requireProTierUnlocked(db: SQLiteDatabase): Promise<void> {
  const tier = await loadSubscriptionTier(db);
  if (!isProTier(tier)) {
    throw new DomainError('Облачная синхронизация доступна в Pro');
  }
}

async function countRows(db: SQLiteDatabase, sql: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(sql);
  return row?.count ?? 0;
}

export async function assertCanAddClient(db: SQLiteDatabase): Promise<void> {
  const tier = await loadSubscriptionTier(db);
  if (isProTier(tier)) return;
  const count = await countRows(db, 'SELECT COUNT(*) AS count FROM clients WHERE deleted_at IS NULL');
  if (count >= FREE_RECORD_LIMIT) {
    throw new DomainError('Достигнут лимит клиентов в бесплатной версии');
  }
}

export async function assertCanAddProduct(db: SQLiteDatabase): Promise<void> {
  const tier = await loadSubscriptionTier(db);
  if (isProTier(tier)) return;
  const count = await countRows(db, 'SELECT COUNT(*) AS count FROM products WHERE deleted_at IS NULL');
  if (count >= FREE_RECORD_LIMIT) {
    throw new DomainError('Достигнут лимит продуктов в бесплатной версии');
  }
}

export async function assertCanAddClientRequest(db: SQLiteDatabase): Promise<void> {
  const tier = await loadSubscriptionTier(db);
  if (isProTier(tier)) return;
  const count = await countRows(db, 'SELECT COUNT(*) AS count FROM client_requests WHERE deleted_at IS NULL');
  if (count >= FREE_RECORD_LIMIT) {
    throw new DomainError('Достигнут лимит запросов в бесплатной версии');
  }
}

export async function runCloudSync(db: SQLiteDatabase): Promise<void> {
  await requireProTierUnlocked(db);
  const { runCloudSyncWithSupabase } = await import('@/data/cloudSync');
  await runCloudSyncWithSupabase(db);
}

export { FREE_RECORD_LIMIT };
