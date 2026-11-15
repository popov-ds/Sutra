export const FREE_RECORD_LIMIT = 10;

export type SubscriptionTier = 'free' | 'pro';

export function isProTier(tier: SubscriptionTier): boolean {
  return tier === 'pro';
}
