import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getRuStoreProducts, type RuStoreProduct } from '@/billing/ruStoreApi';
import { useLanguage } from '@/i18n/LanguageProvider';
import { CatalogEditorModal } from '@/ui/catalog/CatalogEditorModal';
import { theme } from '@/ui/theme';
import { Button } from '@/ui/ui';

import { defaultPlanFallbackRub, formatRuStorePlanPriceLabel } from './proPlanOffers';

const PLAN_IDS = ['pro_month', 'pro_year'] as const;

type Props = {
  visible: boolean;
  busy: boolean;
  notice: string | null;
  onClearNotice: () => void;
  onClose: () => void;
  onSelectPlan: (productId: (typeof PLAN_IDS)[number]) => void;
  onApplyPromo: (code: string) => void;
};

export function ProPlanPickerModal({
  visible,
  busy,
  notice,
  onClearNotice,
  onClose,
  onSelectPlan,
  onApplyPromo,
}: Props) {
  const { text } = useLanguage();
  const [promo, setPromo] = useState('');
  const [products, setProducts] = useState<Record<string, RuStoreProduct | undefined>>({});

  useEffect(() => {
    if (!visible) {
      setPromo('');
      return;
    }
    let cancelled = false;
    void getRuStoreProducts([...PLAN_IDS]).then((list) => {
      if (cancelled) return;
      const byId: Record<string, RuStoreProduct | undefined> = {};
      for (const id of PLAN_IDS) {
        byId[id] = list.find((item) => item.productId === id);
      }
      setProducts(byId);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const planButtons = useMemo(
    () =>
      PLAN_IDS.map((id) => {
        const period = id === 'pro_month' ? text.proPlanPeriodMonth : text.proPlanPeriodYear;
        const price = formatRuStorePlanPriceLabel(products[id], defaultPlanFallbackRub(id));
        return {
          id,
          label: text.proPlanOfferLabel(period, price),
        };
      }),
    [products, text],
  );

  const applyPromo = () => {
    const code = promo.trim();
    if (!code || busy) return;
    onApplyPromo(code);
  };

  return (
    <CatalogEditorModal visible={visible} onClose={onClose}>
      <Text style={styles.title}>{text.proPlanChooseTitle}</Text>
      <Text style={styles.hint}>{text.proPlanChooseHint}</Text>

      <View style={styles.planList}>
        {planButtons.map((plan) => (
          <Pressable
            key={plan.id}
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onSelectPlan(plan.id)}
            style={[styles.planButton, busy && styles.planButtonDisabled]}
          >
            <Text style={styles.planButtonText}>{plan.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.promoRow}>
        <TextInput
          accessibilityLabel={text.promoCodePlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
          onChangeText={(value) => {
            setPromo(value);
            if (notice) onClearNotice();
          }}
          placeholder={text.promoCodePlaceholder}
          placeholderTextColor={theme.muted}
          style={styles.promoInput}
          value={promo}
        />
        <Button label={text.promoCodeApply} onPress={applyPromo} disabled={busy || !promo.trim()} />
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Button label={text.back} tone="quiet" onPress={onClose} disabled={busy} />
    </CatalogEditorModal>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.ink, fontSize: 18, fontWeight: '700' },
  hint: { color: theme.muted, fontSize: 14, lineHeight: 20 },
  planList: { gap: 10 },
  planButton: {
    alignItems: 'center',
    backgroundColor: theme.service,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  planButtonDisabled: { opacity: 0.55 },
  planButtonText: { color: theme.white, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  promoRow: { alignItems: 'stretch', flexDirection: 'row', gap: 10 },
  promoInput: {
    backgroundColor: theme.white,
    borderColor: theme.line,
    borderRadius: 12,
    borderWidth: 1,
    color: theme.ink,
    flex: 1,
    fontSize: 16,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notice: { color: theme.danger, fontSize: 14, lineHeight: 20 },
});