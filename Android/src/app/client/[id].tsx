import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listClientRequests } from '@/data/clientRequests';
import { loadClientCard, updateClientProfile, updateClientStatus } from '@/data/clients';
import { deletePurchase } from '@/data/purchases';
import { formatRuDate, todayIso } from '@/domain/dates';
import { CLIENT_STATUSES, type Client, type ClientStatus } from '@/domain/types';
import { useStrings } from '@/i18n/LanguageProvider';
import { translateError } from '@/i18n/text';
import { CatalogPickerModal } from '@/ui/catalog/CatalogPickerModal';
import { CatalogSelectField } from '@/ui/catalog/CatalogSelectField';
import { theme } from '@/ui/theme';
import { Button, Field, Notice, SectionTitle, TaskCard } from '@/ui/ui';
import { useLoader } from '@/ui/useLoader';

type Draft = {
  name: string;
  phone: string;
  status: ClientStatus;
  clientRequestId: string | null;
  additionalInfo: string;
};

export default function ClientCardScreen() {
  const db = useSQLiteContext();
  const text = useStrings();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const clientId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data, error, loading } = useLoader(clientId ?? '', () => {
    if (!clientId) throw new Error(text.missingClient);
    return loadClientCard(db, clientId);
  });
  const { data: clientRequests } = useLoader('client-requests-card', () => listClientRequests(db));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftClientId, setDraftClientId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [requestPickerOpen, setRequestPickerOpen] = useState(false);

  if (data && draftClientId !== data.client.id) {
    setDraftClientId(data.client.id);
    setDraft(toDraft(data.client));
  }

  const requestLabel =
    draft?.clientRequestId != null
      ? (clientRequests?.find((item) => item.id === draft.clientRequestId)?.name ?? null)
      : null;

  const changeStatus = async (next: ClientStatus) => {
    if (!clientId || !draft || draft.status === next) return;
    setNotice(null);
    try {
      const result = await updateClientStatus(db, clientId, next, todayIso());
      setDraft((current) => (current ? { ...current, status: result.client.status } : current));
      setNotice(
        result.partnershipTask
          ? text.partnershipScheduled(formatRuDate(result.partnershipTask.touchOn))
          : null,
      );
    } catch (caught) {
      setNotice(translateError(caught, text, text.statusFailed));
    }
  };

  const confirmDeletePurchase = (purchaseId: string, productName: string) => {
    Alert.alert(text.deletePurchase, text.deletePurchaseConfirm(productName), [
      { text: text.back, style: 'cancel' },
      {
        text: text.deletePurchase,
        style: 'destructive',
        onPress: () =>
          void deletePurchase(db, purchaseId).catch((caught) => {
            Alert.alert(text.deletePurchase, translateError(caught, text, text.deletePurchaseFailed));
          }),
      },
    ]);
  };

  const saveProfile = async () => {
    if (!clientId || !draft) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await updateClientProfile(db, clientId, {
        name: draft.name,
        phone: draft.phone,
        clientRequestId: draft.clientRequestId,
        additionalInfo: draft.additionalInfo,
      });
      setDraft(toDraft(updated));
      setNotice(text.profileSaved);
    } catch (caught) {
      setNotice(translateError(caught, text, text.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: draft?.name || data?.client.name || text.client }} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !draft ? <ActivityIndicator color={theme.service} /> : null}
        {draft ? (
          <>
            <Field label={text.name} value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
            <Field
              label={text.phone}
              value={draft.phone}
              onChangeText={(phone) => setDraft({ ...draft, phone })}
              keyboardType="phone-pad"
            />
            {draft.phone ? (
              <Pressable onPress={() => void Linking.openURL(`tel:${draft.phone.replace(/[^\d+]/g, '')}`)}>
                <Text style={styles.call}>{text.call}</Text>
              </Pressable>
            ) : null}

            <CatalogSelectField
              label={text.clientRequestLabel}
              valueLabel={requestLabel}
              placeholder={text.chooseClientRequest}
              onPress={() => setRequestPickerOpen(true)}
            />

            <Field
              label={text.additionalInfo}
              value={draft.additionalInfo}
              onChangeText={(additionalInfo) => setDraft({ ...draft, additionalInfo })}
              multiline
            />

            <View style={styles.block}>
              <Text style={styles.label}>{text.funnel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statuses}>
                {CLIENT_STATUSES.map((status) => {
                  const selected = draft.status === status;
                  return (
                    <Pressable
                      key={status}
                      accessibilityRole="button"
                      accessibilityLabel={text.statusLabel[status]}
                      accessibilityState={{ selected }}
                      onPress={() => void changeStatus(status)}
                      style={[styles.chip, selected && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{text.statusLabel[status]}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.hint}>{text.funnelHint}</Text>
            </View>

            <Button label={saving ? text.saving : text.saveProfile} onPress={() => void saveProfile()} disabled={saving} />
            <Notice text={notice} />

            <View style={styles.block}>
              <SectionTitle>{text.purchases}</SectionTitle>
              <Button
                label={text.recordPurchase}
                onPress={() => router.push({ pathname: '/purchase/new', params: { clientId } })}
              />
              {data && data.purchases.length === 0 ? <Text style={styles.hint}>{text.noPurchases}</Text> : null}
              {data?.purchases.map((purchase) => (
                <View key={purchase.id} style={styles.purchase}>
                  <View style={styles.purchaseBody}>
                    <Text style={styles.purchaseTitle}>{purchase.productName}</Text>
                    <Text style={styles.hint}>
                      {text.purchasedOn(formatRuDate(purchase.purchasedOn), formatRuDate(purchase.courseEndsOn))}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={text.deletePurchase}
                    hitSlop={8}
                    onPress={() => confirmDeletePurchase(purchase.id, purchase.productName)}
                    style={styles.deletePurchase}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={22} color={theme.danger} />
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.block}>
              <SectionTitle>{text.timeline}</SectionTitle>
              {data && data.tasks.length === 0 ? (
                <Text style={styles.hint}>{text.emptyTimeline}</Text>
              ) : null}
              {data?.tasks.map((task) => (
                <TaskCard key={task.id} task={task} today={todayIso()} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <CatalogPickerModal
        visible={requestPickerOpen}
        kind="clientRequest"
        selectedId={draft?.clientRequestId ?? null}
        onSelectedIdChange={(id) => setDraft((current) => (current ? { ...current, clientRequestId: id } : current))}
        onClose={() => setRequestPickerOpen(false)}
        onConfirm={(id) => setDraft((current) => (current ? { ...current, clientRequestId: id } : current))}
        allowClear
        onClear={() => setDraft((current) => (current ? { ...current, clientRequestId: null } : current))}
      />
    </>
  );
}

function toDraft(client: Client): Draft {
  return {
    name: client.name,
    phone: client.phone,
    status: client.status,
    clientRequestId: client.clientRequestId,
    additionalInfo: client.additionalInfo,
  };
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: 16, paddingBottom: 40 },
  block: { gap: 10 },
  label: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  statuses: { gap: 8 },
  chip: { backgroundColor: theme.white, borderColor: theme.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  chipText: { color: theme.ink, fontSize: 14 },
  chipTextOn: { color: theme.white, fontWeight: '700' },
  hint: { color: theme.muted, fontSize: 14, lineHeight: 20 },
  call: { color: theme.service, fontSize: 15, fontWeight: '700' },
  purchase: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingRight: 8,
  },
  purchaseBody: { flex: 1, gap: 4, padding: 12 },
  deletePurchase: { padding: 10 },
  purchaseTitle: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  error: { color: theme.danger },
});
