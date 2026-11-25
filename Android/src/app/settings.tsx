import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { purchaseProPromoSubscription, purchaseProSubscription } from '@/billing';
import { RuStoreBillingError } from '@/billing/rustore';
import { showDevTierTools } from '@/config/devTools';
import { isPlayBuild, isRuStoreBuild } from '@/config/distribution';
import { runCloudSync } from '@/data/subscription';
import { loadSession, sendEmailOtp, signOutCloud, verifyEmailOtp } from '@/data/syncAuth';
import { getSupabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabaseConfig';
import { languageName, type AppLanguage } from '@/i18n/language';
import { useLanguage } from '@/i18n/LanguageProvider';
import { translateError } from '@/i18n/text';
import { useSubscription } from '@/subscription/SubscriptionProvider';
import { theme } from '@/ui/theme';
import { ProPlanPickerModal } from '@/ui/billing/ProPlanPickerModal';
import { ProCloudSyncWarningModal } from '@/ui/ProCloudSyncWarningModal';
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
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [proPickerOpen, setProPickerOpen] = useState(false);
  const [proPickerNotice, setProPickerNotice] = useState<string | null>(null);
  const [cloudWarnOpen, setCloudWarnOpen] = useState(false);
  const cloudEnabled = isSupabaseConfigured();
  const devTools = showDevTierTools();
  const freeAdsLine = isPlayBuild() ? text.freeFeatureAdsPlay : text.freeFeatureAds;

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
  const cloudSyncMissing = isPro && !activeSignedInEmail;

  useEffect(() => {
    if (!cloudSyncMissing) {
      setCloudWarnOpen(false);
      return;
    }
    setCloudWarnOpen(true);
  }, [cloudSyncMissing]);

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

  const openProPlanPicker = () => {
    if (purchaseBusy) return;
    setProPickerNotice(null);
    setProPickerOpen(true);
  };

  const finishProPurchase = async (
    purchase: () => Promise<'free' | 'pro'>,
    options?: { promoFlow?: boolean },
  ) => {
    if (purchaseBusy) return;
    setPurchaseBusy(true);
    setNotice(null);
    if (options?.promoFlow) setProPickerNotice(null);
    try {
      const nextTier = await purchase();
      await setTier(nextTier);
      if (nextTier === 'pro') {
        setProPickerOpen(false);
        setProPickerNotice(null);
        setNotice(text.proPurchaseSuccess);
      } else {
        setNotice(text.proRestoreNone);
      }
    } catch (caught) {
      if (caught instanceof RuStoreBillingError && caught.code === 'cancelled') {
        const message = text.proPurchaseCancelled;
        if (options?.promoFlow) setProPickerNotice(message);
        else setNotice(message);
      } else if (caught instanceof RuStoreBillingError && caught.code === 'promo_not_found') {
        setProPickerNotice(text.promoNotFound);
      } else {
        const message = translateError(caught, text, text.proPurchaseFailed);
        if (options?.promoFlow) setProPickerNotice(message);
        else setNotice(message);
      }
    } finally {
      setPurchaseBusy(false);
    }
  };

  const upgradePro = (productId: string) => {
    void finishProPurchase(() => purchaseProSubscription(productId));
  };

  const applyPromo = (code: string) => {
    void finishProPurchase(() => purchaseProPromoSubscription(code), { promoFlow: true });
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
    <>
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
        {isPro ? <Text style={styles.planLead}>{text.proPlanLead}</Text> : null}
        {!isPro ? (
          <>
            <Text style={styles.planBullet}>• {freeAdsLine}</Text>
            <Text style={styles.planBullet}>• {text.freeFeatureLimit(freeRecordLimit)}</Text>
            <Text style={styles.planBullet}>• {text.freeFeatureNoSync}</Text>
            <Button
              label={purchaseBusy ? text.proPurchasing : text.upgradePro}
              onPress={() => (isRuStoreBuild() ? openProPlanPicker() : void upgradePro('pro_month'))}
              disabled={purchaseBusy}
            />
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
          <View style={styles.cloudSectionHead}>
            <View style={[styles.cloudIconWrap, cloudSyncMissing && styles.cloudIconWrapWarn]}>
              <MaterialCommunityIcons
                name="cloud-outline"
                size={28}
                color={cloudSyncMissing ? theme.danger : theme.service}
              />
            </View>
            <Text style={styles.section}>{text.syncAccountTitle}</Text>
          </View>
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

    <ProCloudSyncWarningModal
      closeLabel={text.dialogClose}
      message={text.proCloudSyncWarning}
      onClose={() => setCloudWarnOpen(false)}
      visible={cloudWarnOpen}
    />

    <ProPlanPickerModal
      busy={purchaseBusy}
      notice={proPickerNotice}
      onApplyPromo={applyPromo}
      onClearNotice={() => setProPickerNotice(null)}
      onClose={() => {
        setProPickerOpen(false);
        setProPickerNotice(null);
      }}
      onSelectPlan={upgradePro}
      visible={proPickerOpen}
    />
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 10, padding: 16, paddingBottom: 40 },
  section: { color: theme.ink, fontSize: 18, fontWeight: '700', marginTop: 4 },
  cloudSectionHead: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 4 },
  cloudIconWrap: {
    alignItems: 'center',
    borderColor: theme.line,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    padding: 6,
  },
  cloudIconWrapWarn: { borderColor: theme.danger },
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
