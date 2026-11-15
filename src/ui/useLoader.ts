import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { subscribeData } from '@/data/events';
import { useStrings } from '@/i18n/LanguageProvider';

type LoaderState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

export function useLoader<T>(key: string, load: () => Promise<T>) {
  const text = useStrings();
  const loadRef = useRef(load);
  const [seenKey, setSeenKey] = useState(key);
  const [state, setState] = useState<LoaderState<T>>({ data: null, error: null, loading: true });

  if (seenKey !== key) {
    setSeenKey(key);
    setState({ data: null, error: null, loading: true });
  }

  const apply = useCallback((data: T) => {
    setState({ data, error: null, loading: false });
  }, []);

  const fail = useCallback((error: unknown) => {
    setState((current) => ({
      data: current.data,
      error: error instanceof Error ? error.message : text.loadFailed,
      loading: false,
    }));
  }, [text.loadFailed]);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const reload = useCallback(() => {
    return loadRef
      .current()
      .then(apply)
      .catch(fail);
  }, [apply, fail]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const requestKey = key;
      void loadRef
        .current()
        .then((data) => {
          if (!cancelled && requestKey === key) apply(data);
        })
        .catch((error: unknown) => {
          if (!cancelled && requestKey === key) fail(error);
        });
      return () => {
        cancelled = true;
      };
    }, [apply, fail, key]),
  );

  useEffect(() => subscribeData(() => void reload()), [reload]);

  return { ...state, reload };
}
