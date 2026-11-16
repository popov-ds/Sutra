import type { SQLiteDatabase } from 'expo-sqlite';

import { enqueueWrite } from '@/db/queue';
import { isAppLanguage, systemLanguage, type AppLanguage } from '@/i18n/language';

const LANGUAGE_KEY = 'app_language';

let cachedLanguage: AppLanguage | null = null;

export function peekLanguage(): AppLanguage {
  return cachedLanguage ?? systemLanguage();
}

export function rememberLanguage(language: AppLanguage): void {
  cachedLanguage = language;
}

export async function ensureSettingsTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`);
}

export async function loadStoredLanguage(db: SQLiteDatabase): Promise<AppLanguage> {
  await ensureSettingsTable(db);
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', LANGUAGE_KEY);
  const stored = isAppLanguage(row?.value) ? row.value : null;
  const language = stored ?? systemLanguage();
  if (!stored) {
    await db.runAsync(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      LANGUAGE_KEY,
      language,
    );
  }
  rememberLanguage(language);
  return language;
}

export function saveLanguage(db: SQLiteDatabase, language: AppLanguage): Promise<void> {
  rememberLanguage(language);
  return enqueueWrite(db, async () => {
    await ensureSettingsTable(db);
    await db.runAsync(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      LANGUAGE_KEY,
      language,
    );
  });
}
