import type { SubscriptionTier } from '@/domain/plan';

/**
 * Google Play Billing подписка Pro — подключить react-native-iap или Play Billing Library.
 */
export async function purchaseProSubscription(): Promise<SubscriptionTier> {
  throw new Error('Google Play billing is not integrated yet');
}

export async function restoreProSubscription(): Promise<SubscriptionTier> {
  throw new Error('Google Play billing is not integrated yet');
}
