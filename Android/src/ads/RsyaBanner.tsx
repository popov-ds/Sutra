import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import {
  PixelRatio,
  Platform,
  requireNativeComponent,
  StyleSheet,
  Text,
  UIManager,
  View,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';

import { useStrings } from '@/i18n/LanguageProvider';
import { useSubscription } from '@/subscription/SubscriptionProvider';
import { theme } from '@/ui/theme';

type RsyaAdEvent = {
  adUnitId: string;
  heightPx?: number;
};

type NativeBannerProps = ViewProps & {
  adUnitId: string;
  collapsable?: boolean;
  onAdLoaded?: (event: NativeSyntheticEvent<RsyaAdEvent>) => void;
};

function nativeYandexBannerAvailable(): boolean {
  if (Platform.OS !== 'android') return false;
  return UIManager.getViewManagerConfig('YandexBannerView') != null;
}

const YandexBannerView = nativeYandexBannerAvailable()
  ? requireNativeComponent<NativeBannerProps>('YandexBannerView')
  : null;

const DEFAULT_SLOT_HEIGHT = 50;
const WRAP_PADDING_V = 4;

export function bannerDockHeightDp(bannerSlotDp: number): number {
  return bannerSlotDp + WRAP_PADDING_V * 2 + 1;
}

function readAdUnitId(): string | null {
  const extra = Constants.expoConfig?.extra as { rsyaBannerUnitId?: string } | undefined;
  const fromExtra = extra?.rsyaBannerUnitId?.trim();
  if (fromExtra) return fromExtra;
  return process.env.EXPO_PUBLIC_RSYA_BANNER_ID?.trim() || null;
}

function slotHeightDpFromPx(heightPx: number): number {
  const dp = Math.ceil(heightPx / PixelRatio.get());
  return Math.max(32, dp);
}

type RsyaBannerProps = {
  onSlotHeightDp?: (totalDockHeightDp: number) => void;
};

export function RsyaBanner({ onSlotHeightDp }: RsyaBannerProps = {}) {
  const { isPro } = useSubscription();
  const text = useStrings();
  const adUnitId = readAdUnitId();

  if (isPro || Platform.OS === 'web') return null;

  if (YandexBannerView && adUnitId) {
    return <RsyaBannerNative key={adUnitId} adUnitId={adUnitId} onSlotHeightDp={onSlotHeightDp} />;
  }

  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderLabel}>{text.adPlaceholder}</Text>
    </View>
  );
}

function RsyaBannerNative({
  adUnitId,
  onSlotHeightDp,
}: {
  adUnitId: string;
  onSlotHeightDp?: (totalDockHeightDp: number) => void;
}) {
  const [slotHeight, setSlotHeight] = useState(DEFAULT_SLOT_HEIGHT);

  useEffect(() => {
    onSlotHeightDp?.(bannerDockHeightDp(DEFAULT_SLOT_HEIGHT));
  }, [onSlotHeightDp]);

  const onAdLoaded = useCallback(
    (event: NativeSyntheticEvent<RsyaAdEvent>) => {
      const { heightPx } = event.nativeEvent;
      if (heightPx == null || heightPx <= 0) return;
      const next = slotHeightDpFromPx(heightPx);
      setSlotHeight(next);
      onSlotHeightDp?.(bannerDockHeightDp(next));
    },
    [onSlotHeightDp],
  );

  const BannerView = YandexBannerView;
  if (!BannerView) return null;

  return (
    <View style={styles.wrap}>
      <BannerView
        adUnitId={adUnitId}
        collapsable={false}
        onAdLoaded={onAdLoaded}
        style={[styles.banner, { height: slotHeight }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderTopColor: theme.line,
    borderTopWidth: 1,
    paddingVertical: WRAP_PADDING_V,
    width: '100%',
  },
  banner: {
    alignSelf: 'stretch',
    width: '100%',
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: '#ECE8E0',
    borderTopColor: theme.line,
    borderTopWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    width: '100%',
  },
  placeholderLabel: { color: theme.muted, fontSize: 12, fontWeight: '600' },
});
