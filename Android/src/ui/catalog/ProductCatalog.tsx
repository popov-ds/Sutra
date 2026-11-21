import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { createProduct, deleteProduct, listProducts, updateProduct } from '@/data/products';
import type { Product } from '@/domain/types';
import { useStrings } from '@/i18n/LanguageProvider';
import { translateError } from '@/i18n/text';
import { theme } from '@/ui/theme';
import { ConfirmDeleteDialog } from '@/ui/ConfirmDeleteDialog';
import { Button, Field, Notice } from '@/ui/ui';
import { useLoader } from '@/ui/useLoader';

import { CatalogEditorModal } from './CatalogEditorModal';
import { CatalogEntryRow } from './CatalogEntryRow';
import { catalogStyles as styles } from './catalogStyles';

type EditorMode = 'add' | 'edit' | null;

type ProductCatalogProps = {
  pickerMode?: boolean;
  pickerSelectedId?: string | null;
  onPickerSelectedIdChange?: (id: string | null) => void;
  onPickerConfirm?: (id: string) => void;
  /** Инкремент из header «Добавить» на экране справочника. */
  addRequestTick?: number;
};

export function ProductCatalog({
  pickerMode = false,
  pickerSelectedId,
  onPickerSelectedIdChange,
  onPickerConfirm,
  addRequestTick = 0,
}: ProductCatalogProps) {
  const db = useSQLiteContext();
  const text = useStrings();
  const { data, error, loading } = useLoader(pickerMode ? 'products-picker' : 'products', () => listProducts(db));
  const [mode, setMode] = useState<EditorMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [days, setDays] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const resetEditor = useCallback(() => {
    setMode(null);
    setEditingId(null);
    setName('');
    setDays('');
    setNotice(null);
  }, []);

  const startAdd = useCallback(() => {
    onPickerSelectedIdChange?.(null);
    setMode('add');
    setEditingId(null);
    setName('');
    setDays('');
    setNotice(null);
  }, [onPickerSelectedIdChange]);

  useEffect(() => {
    if (addRequestTick === 0) return;
    startAdd();
  }, [addRequestTick, startAdd]);

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setMode('edit');
    setName(product.name);
    setDays(String(product.durationDays));
    setNotice(null);
    onPickerSelectedIdChange?.(product.id);
  };

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const durationDays = Number(days);
      if (mode === 'add') {
        const created = await createProduct(db, name, durationDays);
        onPickerSelectedIdChange?.(created.id);
      } else if (mode === 'edit' && editingId) {
        await updateProduct(db, editingId, name, durationDays);
      }
      resetEditor();
    } catch (caught) {
      setNotice(translateError(caught, text, text.saveProductFailed));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteRow = (product: Product) => setDeleteTarget(product);

  const remove = async (productId: string) => {
    await deleteProduct(db, productId);
    if (editingId === productId) resetEditor();
    if (pickerSelectedId === productId) onPickerSelectedIdChange?.(null);
  };

  const onRowPress = (product: Product) => {
    if (pickerMode && onPickerConfirm) {
      onPickerSelectedIdChange?.(product.id);
      onPickerConfirm(product.id);
      return;
    }
    openEdit(product);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !data ? <ActivityIndicator color={theme.service} /> : null}
        {data && data.length === 0 ? <Text style={styles.empty}>{text.emptyProducts}</Text> : null}
        {data?.map((product) => (
          <CatalogEntryRow
            key={product.id}
            title={product.name}
            meta={text.durationDays(product.durationDays)}
            selected={pickerMode && product.id === pickerSelectedId}
            onPress={() => onRowPress(product)}
            onEdit={pickerMode ? () => openEdit(product) : undefined}
            editLabel={text.editProduct}
            onDelete={() => confirmDeleteRow(product)}
            deleteLabel={text.deleteProduct}
          />
        ))}

        <Notice text={notice} />
      </ScrollView>

      <CatalogEditorModal visible={mode !== null} onClose={resetEditor}>
        <Text style={styles.formTitle}>{mode === 'add' ? text.addProduct : text.editProduct}</Text>
        <Field label={text.productName} value={name} onChangeText={setName} />
        <Field label={text.courseDays} value={days} onChangeText={setDays} keyboardType="number-pad" />
        <View style={styles.formActions}>
          <Button label={text.back} tone="quiet" onPress={resetEditor} />
          <Button label={saving ? text.saving : text.saveProduct} onPress={() => void save()} disabled={saving} />
        </View>
      </CatalogEditorModal>

      <ConfirmDeleteDialog
        visible={deleteTarget !== null}
        title={text.deleteProduct}
        message={deleteTarget ? text.deleteProductConfirm(deleteTarget.name) : ''}
        confirmLabel={text.deleteProduct}
        cancelLabel={text.back}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await remove(deleteTarget.id);
          } catch (caught) {
            throw new Error(translateError(caught, text, text.deleteProductFailed));
          }
        }}
      />
    </View>
  );
}