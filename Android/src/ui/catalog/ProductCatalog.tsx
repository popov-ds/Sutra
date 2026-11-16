import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { createProduct, deleteProduct, listProducts, updateProduct } from '@/data/products';
import type { Product } from '@/domain/types';
import { useStrings } from '@/i18n/LanguageProvider';
import { translateError } from '@/i18n/text';
import { theme } from '@/ui/theme';
import { Button, Field, Notice } from '@/ui/ui';
import { useLoader } from '@/ui/useLoader';

import { catalogStyles as styles } from './catalogStyles';

type EditorMode = 'add' | 'edit' | null;

type ProductCatalogProps = {
  pickerMode?: boolean;
  pickerSelectedId?: string | null;
  onPickerSelectedIdChange?: (id: string | null) => void;
  onPickerConfirm?: (id: string) => void;
};

export function ProductCatalog({
  pickerMode = false,
  pickerSelectedId,
  onPickerSelectedIdChange,
  onPickerConfirm,
}: ProductCatalogProps) {
  const db = useSQLiteContext();
  const text = useStrings();
  const { data, error, loading } = useLoader(pickerMode ? 'products-picker' : 'products', () => listProducts(db));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>(null);
  const [name, setName] = useState('');
  const [days, setDays] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeSelectedId = pickerMode ? (pickerSelectedId ?? null) : selectedId;
  const setActiveSelectedId = pickerMode ? onPickerSelectedIdChange : setSelectedId;

  const selected = data?.find((item) => item.id === activeSelectedId) ?? null;

  const resetEditor = useCallback(() => {
    setMode(null);
    setName('');
    setDays('');
    setNotice(null);
  }, []);

  const startAdd = () => {
    setActiveSelectedId?.(null);
    setMode('add');
    setName('');
    setDays('');
    setNotice(null);
  };

  const startEdit = () => {
    if (!selected) {
      setNotice(text.selectProductFirst);
      return;
    }
    setMode('edit');
    setName(selected.name);
    setDays(String(selected.durationDays));
    setNotice(null);
  };

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const durationDays = Number(days);
      if (mode === 'add') {
        const created = await createProduct(db, name, durationDays);
        setActiveSelectedId?.(created.id);
      } else if (mode === 'edit' && activeSelectedId) {
        await updateProduct(db, activeSelectedId, name, durationDays);
      }
      resetEditor();
    } catch (caught) {
      setNotice(translateError(caught, text, text.saveProductFailed));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!selected) {
      setNotice(text.selectProductFirst);
      return;
    }
    Alert.alert(text.deleteProduct, text.deleteProductConfirm(selected.name), [
      { text: text.back, style: 'cancel' },
      {
        text: text.deleteProduct,
        style: 'destructive',
        onPress: () => void remove(selected.id),
      },
    ]);
  };

  const remove = async (productId: string) => {
    setNotice(null);
    try {
      await deleteProduct(db, productId);
      if (activeSelectedId === productId) setActiveSelectedId?.(null);
      resetEditor();
    } catch (caught) {
      setNotice(translateError(caught, text, text.deleteProductFailed));
    }
  };

  const pickRow = (productId: string) => {
    if (pickerMode && !mode && onPickerConfirm) {
      if (activeSelectedId === productId) onPickerConfirm(productId);
      else setActiveSelectedId?.(productId);
      return;
    }
    setActiveSelectedId?.(productId);
    if (mode === 'edit') {
      const product = data?.find((item) => item.id === productId);
      if (product) {
        setName(product.name);
        setDays(String(product.durationDays));
      }
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !data ? <ActivityIndicator color={theme.service} /> : null}
        {data && data.length === 0 && !mode ? <Text style={styles.empty}>{text.emptyProducts}</Text> : null}
        {data?.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            selected={product.id === activeSelectedId}
            durationLabel={text.durationDays(product.durationDays)}
            onPress={() => pickRow(product.id)}
          />
        ))}

        {mode ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>{mode === 'add' ? text.addProduct : text.editProduct}</Text>
            <Field label={text.productName} value={name} onChangeText={setName} />
            <Field label={text.courseDays} value={days} onChangeText={setDays} keyboardType="number-pad" />
            <View style={styles.formActions}>
              <Button label={text.back} tone="quiet" onPress={resetEditor} />
              <Button label={saving ? text.saving : text.saveProduct} onPress={() => void save()} disabled={saving} />
            </View>
          </View>
        ) : null}
        <Notice text={notice} />
      </ScrollView>

      <View style={styles.toolbar}>
        <ToolbarButton label={text.add} onPress={startAdd} />
        <ToolbarButton label={text.editProduct} onPress={startEdit} disabled={!selected} />
        <ToolbarButton label={text.deleteProduct} onPress={confirmDelete} disabled={!selected} danger />
      </View>

    </View>
  );
}

function ProductRow({
  product,
  selected,
  durationLabel,
  onPress,
}: {
  product: Product;
  selected: boolean;
  durationLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.row, selected && styles.rowOn]}
    >
      <Text style={[styles.rowTitle, selected && styles.rowTitleOn]}>{product.name}</Text>
      <Text style={[styles.rowMeta, selected && styles.rowMetaOn]}>{durationLabel}</Text>
    </Pressable>
  );
}

function ToolbarButton({
  label,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.tool, disabled && styles.toolDisabled, danger && !disabled && styles.toolDanger]}
    >
      <Text style={[styles.toolText, danger && !disabled && styles.toolTextDanger]}>{label}</Text>
    </Pressable>
  );
}
