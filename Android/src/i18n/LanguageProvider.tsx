import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { peekLanguage, saveLanguage } from '@/data/settings';

import type { AppLanguage } from './language';
import { textOf, type AppText } from './text';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  text: AppText;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [language, setLanguageState] = useState<AppLanguage>(peekLanguage);

  const setLanguage = useCallback(
    (next: AppLanguage) => {
      setLanguageState(next);
      void saveLanguage(db, next);
    },
    [db],
  );

  const value = useMemo(
    () => ({ language, setLanguage, text: textOf(language) }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is missing');
  return value;
}

export function useStrings(): AppText {
  return useLanguage().text;
}
