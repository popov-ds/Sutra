import type { SubscriptionTier } from '@/domain/plan';

/**
 * RuStore подписка Pro — подключить billing SDK и проверку чека.
 * После успешной оплаты вызывать saveSubscriptionTier(db, 'pro').
 */
export async function purchaseProSubscription(): Promise<SubscriptionTier> {
  throw new Error('RuStore billing is not integrated yet');
}

export async function restoreProSubscription(): Promise<SubscriptionTier> {
  throw new Error('RuStore billing is not integrated yet');
}
