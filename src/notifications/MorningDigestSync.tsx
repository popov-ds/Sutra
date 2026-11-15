import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';

import { subscribeData } from '@/data/events';
import { useLanguage } from '@/i18n/LanguageProvider';
import { syncMorningDigests } from '@/notifications/scheduleMorningDigest';

export function MorningDigestSync() {
  const db = useSQLiteContext();
  const { language } = useLanguage();

  useEffect(() => {
    void syncMorningDigests(db);
    return subscribeData(() => {
      void syncMorningDigests(db);
    });
  }, [db, language]);

  return null;
}
