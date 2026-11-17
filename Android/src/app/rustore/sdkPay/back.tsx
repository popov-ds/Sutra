import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { theme } from '@/ui/theme';

/** Deep link target after bank / SBP payments; native SDK handles the intent. */
export default function RuStorePayBackScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/settings');
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={theme.service} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', backgroundColor: theme.bg, flex: 1, justifyContent: 'center' },
});