import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/ui/theme';

export function CatalogSelectField({
  label,
  valueLabel,
  placeholder,
  onPress,
}: {
  label: string;
  valueLabel: string | null;
  placeholder: string;
  onPress: () => void;
}) {
  const shown = valueLabel?.trim() ? valueLabel : placeholder;
  const muted = !valueLabel?.trim();

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
        <Text style={[styles.buttonText, muted && styles.placeholder]} numberOfLines={2}>
          {shown}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color={theme.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  button: {
    alignItems: 'center',
    backgroundColor: theme.white,
    borderColor: theme.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  buttonText: { color: theme.ink, flex: 1, fontSize: 16, fontWeight: '600', paddingRight: 8 },
  placeholder: { color: theme.muted, fontWeight: '500' },
});
