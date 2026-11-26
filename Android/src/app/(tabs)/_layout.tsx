import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View, Linking } from 'react-native';

import { useLanguage, useStrings } from '@/i18n/LanguageProvider';
import { supportFormUrl } from '@/lib/supportLinks';
import { ProCloudSyncWarningGate } from '@/ui/ProCloudSyncWarningGate';
import { SettingsHeaderButton } from '@/ui/SettingsHeaderButton';
import { theme } from '@/ui/theme';

export default function TabLayout() {
  const text = useStrings();
  const { language } = useLanguage();

  return (
    <>
    <ProCloudSyncWarningGate />
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
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: styles.tabBar,
        safeAreaInsets: { bottom: 0, top: 0, left: 0, right: 0 },
        tabBarIcon: ({ color, focused }) => (
          <View style={[styles.iconWrap, focused && styles.iconWrapOn]}>
            <MaterialCommunityIcons
              name={tabIcon(route.name)}
              size={TAB_ICON}
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
      <Tabs.Screen
        name="support"
        options={{ title: text.supportContact }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            void Linking.openURL(supportFormUrl(language));
            router.navigate('/(tabs)/' as Href);
          },
        }}
      />
    </Tabs>
    </>
  );
}

function tabIcon(routeName: string): keyof typeof MaterialCommunityIcons.glyphMap {
  if (routeName === 'support') return 'comment-outline';
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

const TAB_ICON = 24;
const TAB_ICON_PAD_V = 4;
const TAB_ICON_WRAP_HEIGHT = TAB_ICON + TAB_ICON_PAD_V * 2;
const TAB_BAR_PAD_V = 4;
/** Высота панели = padding + обёртка иконки + padding (без запаса под safe area). */
const TAB_BAR_HEIGHT = TAB_ICON_WRAP_HEIGHT + TAB_BAR_PAD_V * 2;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.card,
    borderTopColor: theme.line,
    borderTopWidth: 1,
    height: TAB_BAR_HEIGHT,
    paddingTop: TAB_BAR_PAD_V,
    paddingBottom: TAB_BAR_PAD_V,
  },
  tabBarItem: {
    height: TAB_ICON_WRAP_HEIGHT,
    justifyContent: 'center',
    paddingVertical: 0,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: TAB_ICON_WRAP_HEIGHT,
    justifyContent: 'center',
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: TAB_ICON_PAD_V,
  },
  iconWrapOn: { backgroundColor: '#D5EFEB' },
  headerActions: { alignItems: 'center', flexDirection: 'row' },
  link: { paddingHorizontal: 16, paddingVertical: 8 },
  linkText: { color: theme.service, fontSize: 16, fontWeight: '700' },
});