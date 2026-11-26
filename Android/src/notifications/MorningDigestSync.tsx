import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';

import { subscribeData } from '@/data/events';
import { useLanguage } from '@/i18n/LanguageProvider';
import { syncMorningDigests } from '@/notifications/scheduleMorningDigest';
import { useSubscription } from '@/subscription/SubscriptionProvider';

export function MorningDigestSync() {
  const db = useSQLiteContext();
  const { language } = useLanguage();
  const { isPro } = useSubscription();

  useEffect(() => {
    void syncMorningDigests(db, { pro: isPro });
    return subscribeData(() => {
      void syncMorningDigests(db, { pro: isPro });
    });
  }, [db, language, isPro]);

  return null;
}
