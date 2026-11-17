import { NativeModules, Platform } from 'react-native';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['ACTIVE', 'PAUSED', 'CONFIRMED', 'PAID']);

export type RuStoreBillingErrorCode =
  | 'unavailable'
  | 'cancelled'
  | 'payment_failed'
  | 'promo_not_found'
  | 'unknown';

export class RuStoreBillingError extends Error {
  readonly code: RuStoreBillingErrorCode;

  constructor(code: RuStoreBillingErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'RuStoreBillingError';
    this.code = code;
  }
}

type PurchaseLaunchResult = {
  purchaseId?: string;
  invoiceId?: string;
  productId?: string;
};

type SubscriptionPurchaseInner = {
  productId: string;
  status: string;
  purchaseId: string;
};

type PurchaseEnvelope = {
  productPurchase?: { productId: string; status: string };
  subscriptionPurchase?: SubscriptionPurchaseInner;
};

export type RuStoreProduct = {
  productId: string;
  type?: string;
  amountLabel?: string;
  price?: number;
  currency?: string;
  title?: string;
};

type RuStoreReactPaySdkModule = {
  getProducts?(productIds: string[]): Promise<RuStoreProduct[]>;
  getPurchaseAvailability(): Promise<{ availability?: boolean; isAvailable?: boolean }>;
  purchase(
    productId: string,
    orderId: string | null,
    quantity: string | null,
    developerPayload: string | null,
    appUserId: string | null,
    appUserEmail: string | null,
    preferredPurchaseType: string | null,
    sdkTheme: string | null,
    purchaseEventListener: unknown | null,
  ): Promise<PurchaseLaunchResult>;
  getPurchases(
    productType: string | null,
    purchaseStatus: string | null,
  ): Promise<PurchaseEnvelope[]>;
};

function getModule(): RuStoreReactPaySdkModule | null {
  if (Platform.OS !== 'android') return null;
  const api = (NativeModules as Record<string, unknown>).RuStoreReactPaySDKModule;
  return (api as RuStoreReactPaySdkModule) ?? null;
}

export function isRuStorePayNativeLinked(): boolean {
  return getModule() != null;
}

export async function assertRuStorePurchasesAvailable(): Promise<void> {
  const api = getModule();
  if (!api) {
    throw new RuStoreBillingError('unavailable', 'RuStore Pay SDK is not linked in this build');
  }
  try {
    const value = await api.getPurchaseAvailability();
    const available = value.availability ?? value.isAvailable ?? false;
    if (!available) {
      throw new RuStoreBillingError(
        'unavailable',
        'RuStore payments are unavailable (install RuStore and sign in)',
      );
    }
  } catch (error) {
    if (error instanceof RuStoreBillingError) throw error;
    throw new RuStoreBillingError('unavailable', 'RuStore payments are unavailable');
  }
}

export async function purchaseRuStoreProduct(productId: string): Promise<void> {
  const api = getModule();
  if (!api) throw new RuStoreBillingError('unavailable');

  await assertRuStorePurchasesAvailable();

  try {
    const result = await api.purchase(
      productId,
      null,
      null,
      null,
      null,
      null,
      'ONE_STEP',
      null,
      null,
    );
    if (result?.purchaseId || result?.invoiceId) return;
    throw new RuStoreBillingError('unknown', 'Purchase did not return a receipt');
  } catch (error) {
    if (error instanceof RuStoreBillingError) throw error;
    const err = error as { code?: string; message?: string };
    const blob = `${String(err.code ?? '')} ${String(err.message ?? '')}`.toLowerCase();
    if (blob.includes('cancel')) {
      throw new RuStoreBillingError('cancelled');
    }
    if (blob.includes('fail') || blob.includes('error')) {
      throw new RuStoreBillingError('payment_failed', err.message);
    }
    throw new RuStoreBillingError('unknown', err.message);
  }
}

export async function getRuStoreProducts(productIds: string[]): Promise<RuStoreProduct[]> {
  const api = getModule();
  if (!api?.getProducts || productIds.length === 0) return [];

  try {
    const products = await api.getProducts(productIds);
    return Array.isArray(products) ? products : [];
  } catch {
    return [];
  }
}

export async function findRuStoreSubscriptionProduct(productId: string): Promise<RuStoreProduct | null> {
  const products = await getRuStoreProducts([productId]);
  const hit = products.find((item) => item.productId === productId);
  if (!hit) return null;
  if (hit.type && hit.type !== 'SUBSCRIPTION') return null;
  return hit;
}

export async function findActiveRuStoreSubscriptionProductIds(): Promise<string[]> {
  const api = getModule();
  if (!api) return [];

  try {
    const purchases = await api.getPurchases('SUBSCRIPTION', null);
    const ids: string[] = [];
    for (const item of purchases) {
      const sub = item.subscriptionPurchase;
      if (!sub) continue;
      if (!ACTIVE_SUBSCRIPTION_STATUSES.has(sub.status)) continue;
      ids.push(sub.productId);
    }
    return ids;
  } catch {
    return [];
  }
}