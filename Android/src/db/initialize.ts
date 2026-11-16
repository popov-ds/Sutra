import type { SQLiteDatabase } from 'expo-sqlite';

import { todayIso } from '@/domain/dates';
import { MIGRATION_V1, MIGRATION_V2 } from '@/db/schema';
import { loadStoredLanguage } from '@/data/settings';
import { loadSubscriptionTier } from '@/data/subscription';
import { markOverdueTasks } from '@/data/tasks';

const DATABASE_VERSION = 2;

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  try {
    await db.execAsync('PRAGMA journal_mode = WAL;');
  } catch {
    // Browser SQLite does not always accept WAL. The default journal is enough there.
  }

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = versionRow?.user_version ?? 0;
  if (version < DATABASE_VERSION) {
    if (version === 0) {
      await db.execAsync(MIGRATION_V1);
      version = 1;
    }
    if (version < 2) {
      await db.execAsync(MIGRATION_V2);
      version = 2;
    }
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }

  await Promise.all([loadStoredLanguage(db), loadSubscriptionTier(db)]);
  await markOverdueTasks(db, todayIso());
}
