import { getDistributionChannel } from '@/config/distribution';
import type { SubscriptionTier } from '@/domain/plan';

import * as play from './play';
import * as rustore from './rustore';

export async function purchaseProSubscription(): Promise<SubscriptionTier> {
  return getDistributionChannel() === 'play'
    ? play.purchaseProSubscription()
    : rustore.purchaseProSubscription();
}

export async function restoreProSubscription(): Promise<SubscriptionTier> {
  return getDistributionChannel() === 'play'
    ? play.restoreProSubscription()
    : rustore.restoreProSubscription();
}
