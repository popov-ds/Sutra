import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { loadSession } from '@/data/syncAuth';
import { isProCloudSyncWarnDismissed, setProCloudSyncWarnDismissed } from '@/data/proCloudSyncWarningPref';
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
    void Promise.all([loadSession(), isProCloudSyncWarnDismissed()]).then(([session, dismissed]) => {
      setVisible(!session?.user && !dismissed);
    });
  }, [isPro]);

  useFocusEffect(
    useCallback(() => {
      evaluate();
    }, [evaluate]),
  );

  const onClose = (dontShowAgain: boolean) => {
    setVisible(false);
    if (dontShowAgain) void setProCloudSyncWarnDismissed();
  };

  return (
    <ProCloudSyncWarningModal
      closeLabel={text.dialogClose}
      dontShowAgainLabel={text.proCloudSyncWarnDontShowAgain}
      message={text.proCloudSyncWarning}
      onClose={onClose}
      visible={visible}
    />
  );
}