import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { showDevTierTools } from '@/config/devTools';
import { isPlayBuild } from '@/config/distribution';
import { runCloudSync } from '@/data/subscription';
import { loadSession, sendEmailOtp, signOutCloud, verifyEmailOtp } from '@/data/syncAuth';
import { getSupabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabaseConfig';
import { languageName, type AppLanguage } from '@/i18n/language';
import { useLanguage } from '@/i18n/LanguageProvider';
import { translateError } from '@/i18n/text';
import { useSubscription } from '@/subscription/SubscriptionProvider';
import { theme } from '@/ui/theme';
import { Button, Notice } from '@/ui/ui';

const LANGUAGES: AppLanguage[] = ['ru', 'en'];

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { language, setLanguage, text } = useLanguage();
  const { isPro, tier, freeRecordLimit, setTier } = useSubscription();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudCode, setCloudCode] = useState('');
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const cloudEnabled = isSupabaseConfigured();
  const devTools = showDevTierTools();
  const freeAdsLine = isPlayBuild() ? text.freeFeatureAdsPlay : text.freeFeatureAds;
  const proPurchaseNotice = isPlayBuild() ? text.proPurchaseSoonPlay : text.proPurchaseSoon;

  useEffect(() => {
    if (!cloudEnabled) return;
    void loadSession().then((session) => setSignedInEmail(session?.user.email ?? null));
    const client = getSupabase();
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user.email ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, [cloudEnabled]);

  const activeSignedInEmail = cloudEnabled ? signedInEmail : null;

  const sendOtp = async () => {
    setAuthBusy(true);
    setNotice(null);
    try {
      await sendEmailOtp(cloudEmail);
      setNotice(text.syncCodeSent);
    } catch (caught) {
      setNotice(translateError(caught, text, text.syncFailed));
    } finally {
      setAuthBusy(false);
    }
  };

  const verifyOtp = async () => {
    setAuthBusy(true);
    setNotice(null);
    try {
      const session = await verifyEmailOtp(cloudEmail, cloudCode);
      setSignedInEmail(session.user.email ?? cloudEmail);
      setCloudCode('');
      setNotice(text.syncDone);
    } catch (caught) {
      setNotice(translateError(caught, text, text.syncFailed));
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    setAuthBusy(true);
    try {
      await signOutCloud();
      setSignedInEmail(null);
    } finally {
      setAuthBusy(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      await runCloudSync(db);
      setNotice(text.syncDone);
    } catch (caught) {
      setNotice(translateError(caught, text, text.syncFailed));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: text.settings }} />

      <Text style={styles.section}>{text.language}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text.language}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.field}
      >
        <Text style={styles.value}>{languageName(language)}</Text>
        <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {LANGUAGES.map((item) => {
            const selected = item === language;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setLanguage(item);
                  setOpen(false);
                }}
                style={[styles.option, selected && styles.optionOn]}
              >
                <Text style={[styles.optionText, selected && styles.optionTextOn]}>{languageName(item)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Text style={styles.hint}>{text.languageHint}</Text>

      <Text style={styles.section}>{text.planTitle}</Text>
      <View style={styles.planCard}>
        <Text style={styles.planBadge}>{isPro ? text.planProBadge : text.planFreeBadge}</Text>
        <Text style={styles.planLead}>{isPro ? text.proPlanLead : text.freePlanLead(freeRecordLimit)}</Text>
        {!isPro ? (
          <>
            <Text style={styles.planBullet}>• {freeAdsLine}</Text>
            <Text style={styles.planBullet}>• {text.freeFeatureLimit(freeRecordLimit)}</Text>
            <Text style={styles.planBullet}>• {text.freeFeatureNoSync}</Text>
            <Button label={text.upgradePro} onPress={() => setNotice(proPurchaseNotice)} />
          </>
        ) : (
          <>
            <Text style={styles.planBullet}>• {text.proFeatureNoAds}</Text>
            <Text style={styles.planBullet}>• {text.proFeatureUnlimited}</Text>
            <Text style={styles.planBullet}>• {text.proFeatureSync}</Text>
            {devTools ? (
              <Button label={text.downgradeFreeDev} tone="quiet" onPress={() => void setTier('free')} />
            ) : null}
          </>
        )}
        {devTools && !isPro ? (
          <Button label={text.enableProDev} tone="quiet" onPress={() => void setTier('pro')} />
        ) : null}
      </View>

      {isPro && cloudEnabled ? (
        <>
          <Text style={styles.section}>{text.syncAccountTitle}</Text>
          <View style={styles.planCard}>
            <Text style={styles.hint}>{text.syncAccountHint}</Text>
            {activeSignedInEmail ? (
              <>
                <Text style={styles.planLead}>{text.syncSignedIn(activeSignedInEmail)}</Text>
                <Button
                  label={syncing ? text.syncing : text.syncNow}
                  onPress={() => void syncNow()}
                  disabled={syncing || authBusy}
                />
                <Button label={text.syncSignOut} tone="quiet" onPress={() => void signOut()} disabled={authBusy || syncing} />
              </>
            ) : (
              <>
                <Text style={styles.label}>{text.syncEmail}</Text>
                <TextInput
                  accessibilityLabel={text.syncEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setCloudEmail}
                  placeholder="you@example.com"
                  style={styles.input}
                  value={cloudEmail}
                />
                <Button label={text.syncSendCode} tone="quiet" onPress={() => void sendOtp()} disabled={authBusy} />
                <Text style={styles.label}>{text.syncCode}</Text>
                <TextInput
                  accessibilityLabel={text.syncCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="number-pad"
                  onChangeText={setCloudCode}
                  style={styles.input}
                  value={cloudCode}
                />
                <Button label={text.syncVerify} onPress={() => void verifyOtp()} disabled={authBusy} />
              </>
            )}
          </View>
        </>
      ) : null}

      <Notice text={notice} />
      {devTools ? <Text style={styles.devNote}>DEV: tier = {tier}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 10, padding: 16, paddingBottom: 40 },
  section: { color: theme.ink, fontSize: 18, fontWeight: '700', marginTop: 4 },
  planCard: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D5EFEB',
    borderRadius: 8,
    color: theme.service,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  planLead: { color: theme.ink, fontSize: 15, lineHeight: 22 },
  planBullet: { color: theme.muted, fontSize: 14, lineHeight: 20 },
  label: { color: theme.muted, fontSize: 13, fontWeight: '600', marginTop: 8 },
  field: {
    alignItems: 'center',
    backgroundColor: theme.white,
    borderColor: theme.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  value: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  chevron: { color: theme.ink, fontSize: 16 },
  menu: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: { paddingHorizontal: 14, paddingVertical: 14 },
  optionOn: { backgroundColor: '#D5EFEB' },
  optionText: { color: theme.ink, fontSize: 16 },
  optionTextOn: { color: theme.service, fontWeight: '700' },
  hint: { color: theme.muted, fontSize: 14, lineHeight: 20 },
  input: {
    backgroundColor: theme.white,
    borderColor: theme.line,
    borderRadius: 12,
    borderWidth: 1,
    color: theme.ink,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  devNote: { color: theme.muted, fontSize: 12, marginTop: 12 },
});
