import Constants from 'expo-constants';

import type { AppLanguage } from '@/i18n/language';

const DEFAULT_SUPPORT_BASE = 'https://support.dreamer-soft.pro';

export function supportBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.supportBaseUrl;
  if (typeof fromExtra === 'string' && fromExtra.trim()) {
    return fromExtra.trim().replace(/\/$/, '');
  }
  const fromEnv = process.env.EXPO_PUBLIC_SUPPORT_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return DEFAULT_SUPPORT_BASE;
}

export function supportFormUrl(language: AppLanguage): string {
  const base = supportBaseUrl();
  const lang = language === 'en' ? 'en' : 'ru';
  const params = new URLSearchParams({
    source: 'Android',
    product_id: 'Sutra',
    lang,
  });
  return `${base}/?${params.toString()}`;
}