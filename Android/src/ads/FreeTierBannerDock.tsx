import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSubscription } from '@/subscription/SubscriptionProvider';

import { RsyaBanner } from './RsyaBanner';

export function FreeTierBannerDock() {
  const { isPro } = useSubscription();
  const insets = useSafeAreaInsets();
  if (isPro) return null;
  return (
    <View style={[styles.dock, { paddingBottom: insets.bottom }]}>
      <RsyaBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { width: '100%' },
});