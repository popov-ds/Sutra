import { useEffect } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSubscription } from '@/subscription/SubscriptionProvider';

import { useSetAdDockHeight } from './BannerLayoutProvider';
import { RsyaBanner } from './RsyaBanner';

export function FreeTierBannerDock() {
  const { isPro } = useSubscription();
  const insets = useSafeAreaInsets();
  const setAdDockHeight = useSetAdDockHeight();

  useEffect(() => {
    if (isPro) setAdDockHeight(0);
  }, [isPro, setAdDockHeight]);

  const onLayout = (event: LayoutChangeEvent) => {
    setAdDockHeight(event.nativeEvent.layout.height);
  };

  if (isPro) return null;

  return (
    <View onLayout={onLayout} style={[styles.dock, { paddingBottom: insets.bottom }]}>
      <RsyaBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexShrink: 0,
    marginTop: 0,
    width: '100%',
  },
});