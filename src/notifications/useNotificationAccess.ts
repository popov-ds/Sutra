import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  promptNotificationAccess,
  readNotificationAccess,
  type NotificationAccess,
} from '@/notifications/permissions';

type AccessState = NotificationAccess | 'loading';

export function useNotificationAccess() {
  const [access, setAccess] = useState<AccessState>('loading');

  const refresh = useCallback(() => {
    return readNotificationAccess().then(setAccess);
  }, []);

  const prompt = useCallback(async () => {
    const next = await promptNotificationAccess();
    setAccess(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readNotificationAccess().then((next) => {
      if (!cancelled) setAccess(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return { access, refresh, prompt };
}
