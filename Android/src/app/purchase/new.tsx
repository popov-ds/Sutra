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
import { SCREEN_FOOTER_SCROLL_PAD, ScreenFooter } from '@/ui/ScreenFooter';
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
      await recordPurchase(db, {
        clientId,
        productId,
        purchasedOn: parseUserDate(purchasedOn),
      });
      router.back();
    } catch (caught) {
      setNotice(translateError(caught, text, text.recordFailed));
      setSaving(false);
    }
  };

  if (!clientId) {
    return (
      <ScrollView contentContainerStyle={styles.contentPlain}>
        <Stack.Screen options={{ title: text.newPurchase }} />
        <Text style={styles.error}>{text.missingClient}</Text>
        <Button label={text.back} tone="quiet" onPress={() => router.back()} />
      </ScrollView>
    );
  }

  return (
    <>
      <View style={styles.root}>
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
                <TouchPreviewCard key={`${task.type}-${task.touchOn}`} task={task} text={text} language={language} />
              ))}
            </View>
          ) : null}

          <Notice text={notice} />
        </ScrollView>

        <ScreenFooter>
          <View style={styles.footerBtn}>
            <Button
              label={saving ? text.recording : text.recordPurchaseAction}
              onPress={() => void save()}
              disabled={saving || !productId || preview.tasks.length === 0}
            />
          </View>
        </ScreenFooter>
      </View>

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

function TouchPreviewCard({
  task,
  text,
  language,
}: {
  task: TaskDraft;
  text: ReturnType<typeof useLanguage>['text'];
  language: ReturnType<typeof useLanguage>['language'];
}) {
  const colors = categoryColor[task.category];
  const visible = visibleTask(task, text, language);
  return (
    <View style={[styles.preview, { borderLeftColor: colors.ink }]}>
      <Text style={[styles.badge, { color: colors.ink }]}>
        {formatRuDate(task.touchOn)} · {text.category[task.category]}
      </Text>
      <Text style={styles.previewTitle}>{visible.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: theme.bg, flex: 1 },
  content: { gap: 12, padding: 16, paddingBottom: SCREEN_FOOTER_SCROLL_PAD },
  contentPlain: { gap: 12, padding: 16, paddingBottom: 40 },
  label: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  block: { gap: 10 },
  hint: { color: theme.muted, fontSize: 14, lineHeight: 20 },
  preview: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderLeftWidth: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  badge: { fontSize: 13, fontWeight: '700' },
  previewTitle: { color: theme.ink, fontSize: 15, lineHeight: 21 },
  error: { color: theme.danger, fontSize: 14 },
  footerBtn: { flex: 1, minWidth: 0 },
});