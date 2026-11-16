import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStrings } from '@/i18n/LanguageProvider';
import { theme } from '@/ui/theme';

export default function DirectoriesHomeScreen() {
  const text = useStrings();

  return (
    <View style={styles.content}>
      <DirectoryRow
        icon="package-variant"
        label={text.products}
        onPress={() => router.push('/(tabs)/directories/products' as Href)}
      />
      <DirectoryRow
        icon="comment-question-outline"
        label={text.clientRequests}
        onPress={() => router.push('/(tabs)/directories/client-requests' as Href)}
      />
    </View>
  );
}

function DirectoryRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={24} color={theme.service} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={24} color={theme.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  row: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#D5EFEB',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  label: { color: theme.ink, flex: 1, fontSize: 17, fontWeight: '700' },
});
