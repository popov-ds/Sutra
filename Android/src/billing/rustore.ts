import type { SubscriptionTier } from '@/domain/plan';

import {
  getRuStoreProProductIds,
  isPurchasableRuStoreProProductId,
  isRuStoreProProductId,
  promoCodeToRuStoreProductId,
} from './config';
import {
  findActiveRuStoreSubscriptionProductIds,
  findRuStoreSubscriptionProduct,
  isRuStorePayNativeLinked,
  purchaseRuStoreProduct,
  RuStoreBillingError,
} from './ruStoreApi';

function tierFromRuStorePurchases(productIds: string[]): SubscriptionTier {
  return productIds.some((id) => isPurchasableRuStoreProProductId(id)) ? 'pro' : 'free';
}

export async function purchaseProSubscription(productId: string): Promise<SubscriptionTier> {
  if (!isRuStorePayNativeLinked()) {
    throw new RuStoreBillingError('unavailable', 'RuStore billing is not integrated yet');
  }
  if (!isPurchasableRuStoreProProductId(productId)) {
    throw new RuStoreBillingError('unknown', `Unknown subscription product: ${productId}`);
  }
  await purchaseRuStoreProduct(productId);
  const owned = await findActiveRuStoreSubscriptionProductIds();
  return tierFromRuStorePurchases(owned.length ? owned : [productId]);
}

export async function restoreProSubscription(): Promise<SubscriptionTier> {
  if (!isRuStorePayNativeLinked()) {
    throw new RuStoreBillingError('unavailable', 'RuStore billing is not integrated yet');
  }
  const owned = await findActiveRuStoreSubscriptionProductIds();
  if (owned.length === 0) {
    return 'free';
  }
  return tierFromRuStorePurchases(owned);
}

export function defaultRuStoreProProductId(): string {
  const ids = getRuStoreProProductIds();
  return ids.includes('pro_month') ? 'pro_month' : ids[0];
}

export async function purchaseProPromoSubscription(promoCode: string): Promise<SubscriptionTier> {
  if (!isRuStorePayNativeLinked()) {
    throw new RuStoreBillingError('unavailable', 'RuStore billing is not integrated yet');
  }
  const productId = promoCodeToRuStoreProductId(promoCode);
  if (!isPurchasableRuStoreProProductId(productId) || isRuStoreProProductId(productId)) {
    throw new RuStoreBillingError('promo_not_found');
  }
  const product = await findRuStoreSubscriptionProduct(productId);
  if (!product) {
    throw new RuStoreBillingError('promo_not_found');
  }
  return purchaseProSubscription(productId);
}

export { RuStoreBillingError };