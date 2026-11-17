import { getDistributionChannel } from '@/config/distribution';
import type { SubscriptionTier } from '@/domain/plan';

import * as play from './play';
import * as rustore from './rustore';

export async function purchaseProPromoSubscription(promoCode: string): Promise<SubscriptionTier> {
  if (getDistributionChannel() === 'play') {
    return play.purchaseProSubscription();
  }
  return rustore.purchaseProPromoSubscription(promoCode);
}

export async function purchaseProSubscription(productId?: string): Promise<SubscriptionTier> {
  if (getDistributionChannel() === 'play') {
    return play.purchaseProSubscription();
  }
  const id = productId ?? rustore.defaultRuStoreProProductId();
  return rustore.purchaseProSubscription(id);
}

export async function restoreProSubscription(): Promise<SubscriptionTier> {
  return getDistributionChannel() === 'play'
    ? play.restoreProSubscription()
    : rustore.restoreProSubscription();
}
