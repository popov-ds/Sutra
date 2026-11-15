import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useStrings } from '@/i18n/LanguageProvider';
import { theme } from '@/ui/theme';

export function SettingsHeaderButton() {
  const text = useStrings();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text.settings}
      onPress={() => router.push('/settings')}
      hitSlop={8}
      style={styles.settings}
    >
      <MaterialCommunityIcons name="cog" size={26} color={theme.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  settings: { paddingHorizontal: 16, paddingVertical: 8 },
});
