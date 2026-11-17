import Constants from 'expo-constants';

const DEFAULT_PRO_PRODUCT_IDS = ['pro_year', 'pro_month'] as const;

function parseProductIdList(raw: string | undefined): string[] | null {
  if (!raw?.trim()) return null;
  const ids = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return ids.length ? ids : null;
}

export function getRuStoreProProductIds(): string[] {
  const extra = Constants.expoConfig?.extra as { rustoreProProductIds?: string[] } | undefined;
  const fromExtra = extra?.rustoreProProductIds?.filter((id) => id.trim().length > 0);
  if (fromExtra?.length) return fromExtra;

  const fromEnv = parseProductIdList(process.env.EXPO_PUBLIC_RUSTORE_PRO_PRODUCT_IDS);
  if (fromEnv?.length) return fromEnv;

  const legacySingle = process.env.EXPO_PUBLIC_RUSTORE_PRO_PRODUCT_ID?.trim();
  if (legacySingle) return [legacySingle];

  return [...DEFAULT_PRO_PRODUCT_IDS];
}

export function isRuStoreProProductId(productId: string): boolean {
  return getRuStoreProProductIds().includes(productId);
}

const PROMO_PRODUCT_ID = /^pro_[a-z0-9][a-z0-9_]*$/;

/** Standard plan ids or promo subscriptions `pro_<code>` from RuStore Console. */
export function isPurchasableRuStoreProProductId(productId: string): boolean {
  if (isRuStoreProProductId(productId)) return true;
  return PROMO_PRODUCT_ID.test(productId);
}

export function promoCodeToRuStoreProductId(code: string): string {
  return `pro_${code.trim().toLowerCase()}`;
}

export function getRuStoreProPlanFallbackPrices(): { month: number; year: number } {
  const extra = Constants.expoConfig?.extra as
    | { rustoreProMonthPrice?: number; rustoreProYearPrice?: number }
    | undefined;

  const monthFromExtra = extra?.rustoreProMonthPrice;
  const yearFromExtra = extra?.rustoreProYearPrice;
  if (monthFromExtra != null && yearFromExtra != null) {
    return { month: monthFromExtra, year: yearFromExtra };
  }

  const monthEnv = Number(process.env.EXPO_PUBLIC_RUSTORE_PRO_MONTH_PRICE);
  const yearEnv = Number(process.env.EXPO_PUBLIC_RUSTORE_PRO_YEAR_PRICE);
  return {
    month: Number.isFinite(monthEnv) && monthEnv > 0 ? monthEnv : 249,
    year: Number.isFinite(yearEnv) && yearEnv > 0 ? yearEnv : 1490,
  };
}

export function getRuStoreConsoleAppId(): string {
  const extra = Constants.expoConfig?.extra as { rustoreConsoleAppId?: string } | undefined;
  const fromExtra = extra?.rustoreConsoleAppId?.trim();
  if (fromExtra) return fromExtra;
  const fromEnv = process.env.EXPO_PUBLIC_RUSTORE_CONSOLE_APP_ID?.trim();
  if (fromEnv) return fromEnv;
  return '2063787405';
}