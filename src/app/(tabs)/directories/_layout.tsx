import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useStrings } from '@/i18n/LanguageProvider';
import { SettingsHeaderButton } from '@/ui/SettingsHeaderButton';
import { theme } from '@/ui/theme';

export default function DirectoriesLayout() {
  const text = useStrings();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: theme.bg },
        headerRight: () => <SettingsHeaderButton />,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: text.directories,
          headerLeft: () => (
            <HeaderBackButton
              accessibilityLabel={text.today}
              onPress={() => router.navigate('/(tabs)/' as Href)}
            />
          ),
        }}
      />
      <Stack.Screen
        name="products"
        options={{
          title: text.products,
          headerLeft: () => (
            <HeaderBackButton accessibilityLabel={text.back} onPress={() => router.back()} />
          ),
        }}
      />
      <Stack.Screen
        name="client-requests"
        options={{
          title: text.clientRequests,
          headerLeft: () => (
            <HeaderBackButton accessibilityLabel={text.back} onPress={() => router.back()} />
          ),
        }}
      />
    </Stack>
  );
}

function HeaderBackButton({
  accessibilityLabel,
  onPress,
}: {
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={styles.back}
    >
      <MaterialCommunityIcons name="arrow-left" size={26} color={theme.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { paddingHorizontal: 16, paddingVertical: 8 },
});
