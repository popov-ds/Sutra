import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useSubscription } from '@/subscription/SubscriptionProvider';

type BannerLayoutContextValue = {
  adDockHeight: number;
  setAdDockHeight: (height: number) => void;
};

const BannerLayoutContext = createContext<BannerLayoutContextValue | null>(null);

export function BannerLayoutProvider({ children }: { children: ReactNode }) {
  const { isPro } = useSubscription();
  const [measuredHeight, setMeasuredHeight] = useState(0);

  const value = useMemo(
    (): BannerLayoutContextValue => ({
      adDockHeight: isPro ? 0 : measuredHeight,
      setAdDockHeight: setMeasuredHeight,
    }),
    [isPro, measuredHeight],
  );

  return <BannerLayoutContext.Provider value={value}>{children}</BannerLayoutContext.Provider>;
}

function useBannerLayout(): BannerLayoutContextValue {
  const ctx = useContext(BannerLayoutContext);
  if (!ctx) {
    return { adDockHeight: 0, setAdDockHeight: () => {} };
  }
  return ctx;
}

export function useAdDockHeight(): number {
  return useBannerLayout().adDockHeight;
}

export function useSetAdDockHeight(): (height: number) => void {
  return useBannerLayout().setAdDockHeight;
}

export function useContentBottomInset(extra = 16): number {
  return useAdDockHeight() + extra;
}