import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStrings } from '@/i18n/LanguageProvider';
import { SettingsHeaderButton } from '@/ui/SettingsHeaderButton';
import { theme } from '@/ui/theme';

export default function TabLayout() {
  const text = useStrings();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => <SettingsHeaderButton />,
        tabBarActiveTintColor: theme.service,
        tabBarInactiveTintColor: '#2A2622',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.line,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarIcon: ({ color, focused }) => (
          <View style={[styles.iconWrap, focused && styles.iconWrapOn]}>
            <MaterialCommunityIcons
              name={tabIcon(route.name)}
              size={26}
              color={typeof color === 'string' ? color : theme.ink}
            />
          </View>
        ),
        sceneStyle: { backgroundColor: theme.bg },
      })}
    >
      <Tabs.Screen name="index" options={{ title: text.today }} />
      <Tabs.Screen
        name="clients"
        options={{
          title: text.clients,
          headerRight: () => (
            <View style={styles.headerActions}>
              <HeaderLink href="/client/new" label={text.add} />
              <SettingsHeaderButton />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="directories" options={{ title: text.directories, headerShown: false }} />
    </Tabs>
  );
}

function tabIcon(routeName: string): keyof typeof MaterialCommunityIcons.glyphMap {
  if (routeName === 'directories') return 'book-open-variant';
  if (routeName === 'clients') return 'account-group';
  return 'calendar-month';
}

function HeaderLink({ href, label }: { href: Href; label: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(href)} style={styles.link}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    borderRadius: 16,
    justifyContent: 'center',
    minWidth: 72,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  iconWrapOn: { backgroundColor: '#D5EFEB' },
  headerActions: { alignItems: 'center', flexDirection: 'row' },
  link: { paddingHorizontal: 16, paddingVertical: 8 },
  linkText: { color: theme.service, fontSize: 16, fontWeight: '700' },
});