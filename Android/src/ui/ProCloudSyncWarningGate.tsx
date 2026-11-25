import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { loadSession } from '@/data/syncAuth';
import { useStrings } from '@/i18n/LanguageProvider';
import { useSubscription } from '@/subscription/SubscriptionProvider';
import { ProCloudSyncWarningModal } from '@/ui/ProCloudSyncWarningModal';

/** Диалог Pro без облака при запуске и при возврате на вкладки CRM. */
export function ProCloudSyncWarningGate() {
  const text = useStrings();
  const { isPro } = useSubscription();
  const [visible, setVisible] = useState(false);

  const evaluate = useCallback(() => {
    if (!isPro) {
      setVisible(false);
      return;
    }
    void loadSession().then((session) => {
      setVisible(!session?.user);
    });
  }, [isPro]);

  useFocusEffect(
    useCallback(() => {
      evaluate();
    }, [evaluate]),
  );

  return (
    <ProCloudSyncWarningModal
      closeLabel={text.dialogClose}
      message={text.proCloudSyncWarning}
      onClose={() => setVisible(false)}
      visible={visible}
    />
  );
}