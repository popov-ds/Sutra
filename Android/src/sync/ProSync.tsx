import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';

import { subscribeData } from '@/data/events';
import { runCloudSync } from '@/data/subscription';
import { useSubscription } from '@/subscription/SubscriptionProvider';

export function ProSync() {
  const db = useSQLiteContext();
  const { isPro } = useSubscription();

  useEffect(() => {
    if (!isPro) return;
    const push = () => {
      void runCloudSync(db).catch((error: unknown) => {
        console.warn('Cloud sync failed', error);
      });
    };
    push();
    return subscribeData(push);
  }, [db, isPro]);

  return null;
}
