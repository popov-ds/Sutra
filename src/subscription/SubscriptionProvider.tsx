import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { loadSubscriptionTier, peekSubscriptionTier, saveSubscriptionTier } from '@/data/subscription';
import { subscribeData } from '@/data/events';
import { FREE_RECORD_LIMIT, isProTier, type SubscriptionTier } from '@/domain/plan';

type SubscriptionContextValue = {
  tier: SubscriptionTier;
  isPro: boolean;
  freeRecordLimit: number;
  refresh: () => Promise<void>;
  setTier: (tier: SubscriptionTier) => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [tier, setTierState] = useState<SubscriptionTier>(peekSubscriptionTier);

  const refresh = useCallback(async () => {
    const loaded = await loadSubscriptionTier(db);
    setTierState(loaded);
  }, [db]);

  const setTier = useCallback(
    async (next: SubscriptionTier) => {
      await saveSubscriptionTier(db, next);
      setTierState(next);
    },
    [db],
  );

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      loadSubscriptionTier(db).then((loaded) => {
        if (!cancelled) setTierState(loaded);
      });
    void load();
    return subscribeData(load);
  }, [db]);

  const value = useMemo(
    () => ({
      tier,
      isPro: isProTier(tier),
      freeRecordLimit: FREE_RECORD_LIMIT,
      refresh,
      setTier,
    }),
    [refresh, setTier, tier],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error('SubscriptionProvider is missing');
  return value;
}
