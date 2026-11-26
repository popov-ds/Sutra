import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Component, Suspense, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { initializeDatabase } from '@/db/initialize';
import { systemLanguage } from '@/i18n/language';
import { LanguageProvider, useStrings } from '@/i18n/LanguageProvider';
import { textOf } from '@/i18n/text';
import { BannerLayoutProvider } from '@/ads/BannerLayoutProvider';
import { FreeTierBannerDock } from '@/ads/FreeTierBannerDock';
import { MorningDigestSync } from '@/notifications/MorningDigestSync';
import { SubscriptionProvider } from '@/subscription/SubscriptionProvider';
import { ProSync } from '@/sync/ProSync';
import { SettingsHeaderButton } from '@/ui/SettingsHeaderButton';
import { theme } from '@/ui/theme';

export default function RootLayout() {
  return (
    <DatabaseBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <SQLiteProvider databaseName="partner-crm.db" onInit={initializeDatabase} useSuspense>
          <LanguageProvider>
            <SubscriptionProvider>
              <BannerLayoutProvider>
                <StatusBar style="dark" />
                <MorningDigestSync />
                <ProSync />
                <AppChrome />
              </BannerLayoutProvider>
            </SubscriptionProvider>
          </LanguageProvider>
        </SQLiteProvider>
      </Suspense>
    </DatabaseBoundary>
  );
}

function AppChrome() {
  return (
    <View style={styles.appRoot}>
      <View style={styles.appStack}>
        <AppStack />
      </View>
      <FreeTierBannerDock />
    </View>
  );
}

function AppStack() {
  const text = useStrings();
  return (
    <Stack
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: theme.bg },
        headerRight: () => (route.name === 'settings' ? null : <SettingsHeaderButton />),
      })}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: text.back }} />
    </Stack>
  );
}

function LoadingScreen() {
  const text = textOf(systemLanguage());
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.service} />
      <Text style={styles.caption}>{text.openingDatabase}</Text>
    </View>
  );
}

class DatabaseBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    if (!this.state.message) return this.props.children;
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{textOf(systemLanguage()).databaseFailed}</Text>
        <Text style={styles.caption}>{this.state.message}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  appRoot: { flex: 1, gap: 0 },
  appStack: { flex: 1, minHeight: 0 },
  center: {
    alignItems: 'center',
    backgroundColor: theme.bg,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  title: { color: theme.ink, fontSize: 20, fontWeight: '700' },
  caption: { color: theme.muted, fontSize: 15, textAlign: 'center' },
});
