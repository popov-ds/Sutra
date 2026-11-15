export type AppLanguage = 'ru' | 'en';

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === 'ru' || value === 'en';
}

/** Russian system locale stays Russian. Every other locale starts in English. */
export function systemLanguage(): AppLanguage {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
  return locale.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function languageName(language: AppLanguage): string {
  return language === 'en' ? 'English' : 'Русский';
}
