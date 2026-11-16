import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { requireClientUnlocked } from '@/data/mappers';
import { listProducts } from '@/data/products';
import { recordPurchase } from '@/data/purchases';
import { formatRuDate, parseUserDate, todayIso } from '@/domain/dates';
import { buildPurchaseTasks } from '@/domain/touchPlan';
import type { TaskDraft } from '@/domain/types';
import { useLanguage } from '@/i18n/LanguageProvider';
import { translateError, visibleTask } from '@/i18n/text';
import { CatalogPickerModal } from '@/ui/catalog/CatalogPickerModal';
import { CatalogSelectField } from '@/ui/catalog/CatalogSelectField';
import { categoryColor, theme } from '@/ui/theme';
import { Button, DatePickerField, Notice } from '@/ui/ui';
import { useLoader } from '@/ui/useLoader';

export default function NewPurchaseScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ clientId?: string | string[] }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const { language, text } = useLanguage();

  const { data, error, loading } = useLoader(clientId ? `purchase-new-${clientId}` : 'purchase-new-missing', async () => {
    if (!clientId) throw new Error(text.missingClient);
    await requireClientUnlocked(db, clientId);
    const products = await listProducts(db);
    return { products };
  });

  const [productId, setProductId] = useState<string | null>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [purchasedOn, setPurchasedOn] = useState(todayIso());
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<TaskDraft[] | null>(null);

  const selectedProduct = data?.products.find((item) => item.id === productId) ?? null;
  const productValueLabel = selectedProduct
    ? `${selectedProduct.name} · ${text.durationDays(selectedProduct.durationDays)}`
    : null;

  const preview = useMemo(() => {
    const product = data?.products.find((item) => item.id === productId);
    if (!product || !clientId) return { tasks: [] as TaskDraft[], error: null as string | null };
    try {
      let sequence = 0;
      const tasks = buildPurchaseTasks({
        purchaseId: 'preview',
        clientId,
        product,
        purchasedOn: parseUserDate(purchasedOn),
        createId: () => `preview-${sequence++}`,
      });
      return { tasks, error: null };
    } catch (caught) {
      return { tasks: [] as TaskDraft[], error: translateError(caught, text, text.checkDate) };
    }
  }, [clientId, data, purchasedOn, productId, text]);

  const save = async () => {
    if (!clientId || !productId) {
      setNotice(text.chooseProduct);
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const recorded = await recordPurchase(db, {
        clientId,
        productId,
        purchasedOn: parseUserDate(purchasedOn),
      });
      setCreated(recorded.tasks);
    } catch (caught) {
      setNotice(translateError(caught, text, text.recordFailed));
      setSaving(false);
    }
  };

  if (created) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: text.touchesCreated }} />
        <Text style={styles.lead}>{text.touchesCreatedLead(created.length)}</Text>
        {created.map((task) => {
          const colors = categoryColor[task.category];
          return (
            <View key={task.id} style={[styles.preview, { borderLeftColor: colors.ink }]}>
              <Text style={[styles.badge, { color: colors.ink }]}>
                {formatRuDate(task.touchOn)} · {text.category[task.category]}
              </Text>
              <Text style={styles.previewTitle}>{visibleTask(task, text, language).title}</Text>
            </View>
          );
        })}
        <Button label={text.done} onPress={() => router.back()} />
      </ScrollView>
    );
  }

  if (!clientId) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: text.newPurchase }} />
        <Text style={styles.error}>{text.missingClient}</Text>
        <Button label={text.back} tone="quiet" onPress={() => router.back()} />
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: text.newPurchase }} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !data ? <ActivityIndicator color={theme.service} /> : null}

        <CatalogSelectField
          label={text.productLabel}
          valueLabel={productValueLabel}
          placeholder={text.chooseProduct}
          onPress={() => setProductPickerOpen(true)}
        />
        {data && data.products.length === 0 ? <Text style={styles.hint}>{text.noProductsForPurchase}</Text> : null}

        <DatePickerField label={text.purchaseDate} valueIso={purchasedOn} onChangeIso={setPurchasedOn} hint={text.dateHint} />
        <Button label={text.today} tone="quiet" onPress={() => setPurchasedOn(todayIso())} />

        {preview.error ? <Text style={styles.error}>{preview.error}</Text> : null}
        {preview.tasks.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.label}>{text.willCreate}</Text>
            {preview.tasks.map((task) => (
              <Text key={`${task.type}-${task.touchOn}`} style={styles.previewLine}>
                {formatRuDate(task.touchOn)} · {text.category[task.category]}
              </Text>
            ))}
          </View>
        ) : null}

        <Notice text={notice} />
        <Button
          label={saving ? text.recording : text.recordPurchaseAction}
          onPress={() => void save()}
          disabled={saving || !productId || preview.tasks.length === 0}
        />
      </ScrollView>

      <CatalogPickerModal
        visible={productPickerOpen}
        kind="product"
        selectedId={productId}
        onSelectedIdChange={setProductId}
        onClose={() => setProductPickerOpen(false)}
        onConfirm={setProductId}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 40 },
  label: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  block: { gap: 10 },
  hint: { color: theme.muted, fontSize: 14, lineHeight: 20 },
  preview: { backgroundColor: theme.card, borderColor: theme.line, borderLeftWidth: 4, borderRadius: 14, borderWidth: 1, gap: 6, padding: 12 },
  badge: { fontSize: 13, fontWeight: '700' },
  previewTitle: { color: theme.ink, fontSize: 15, lineHeight: 21 },
  previewLine: { color: theme.ink, fontSize: 15 },
  lead: { color: theme.ink, fontSize: 16, lineHeight: 22 },
  error: { color: theme.danger, fontSize: 14 },
});
