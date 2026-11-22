import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import {
  createClientRequest,
  deleteClientRequest,
  listClientRequests,
  updateClientRequest,
} from '@/data/clientRequests';
import type { ClientRequest } from '@/domain/types';
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

type ClientRequestCatalogProps = {
  pickerMode?: boolean;
  pickerSelectedId?: string | null;
  onPickerSelectedIdChange?: (id: string | null) => void;
  onPickerConfirm?: (id: string) => void;
  addRequestTick?: number;
};

export function ClientRequestCatalog({
  pickerMode = false,
  pickerSelectedId,
  onPickerSelectedIdChange,
  onPickerConfirm,
  addRequestTick = 0,
}: ClientRequestCatalogProps) {
  const db = useSQLiteContext();
  const text = useStrings();
  const loaderKey = pickerMode ? 'client-requests-picker' : 'client-requests';
  const { data, error, loading } = useLoader(loaderKey, () => listClientRequests(db));
  const [mode, setMode] = useState<EditorMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientRequest | null>(null);

  const resetEditor = useCallback(() => {
    setMode(null);
    setEditingId(null);
    setName('');
    setNotice(null);
  }, []);

  const onPickerSelectedIdChangeRef = useRef(onPickerSelectedIdChange);
  onPickerSelectedIdChangeRef.current = onPickerSelectedIdChange;

  const startAdd = useCallback(() => {
    onPickerSelectedIdChangeRef.current?.(null);
    setMode('add');
    setEditingId(null);
    setName('');
    setNotice(null);
  }, []);

  useEffect(() => {
    if (addRequestTick === 0) return;
    startAdd();
  }, [addRequestTick, startAdd]);

  const openEdit = (request: ClientRequest) => {
    setEditingId(request.id);
    setMode('edit');
    setName(request.name);
    setNotice(null);
    onPickerSelectedIdChange?.(request.id);
  };

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      if (mode === 'add') {
        const created = await createClientRequest(db, name);
        onPickerSelectedIdChange?.(created.id);
      } else if (mode === 'edit' && editingId) {
        await updateClientRequest(db, editingId, name);
      }
      resetEditor();
    } catch (caught) {
      setNotice(translateError(caught, text, text.saveClientRequestFailed));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteRow = (request: ClientRequest) => setDeleteTarget(request);

  const remove = async (requestId: string) => {
    await deleteClientRequest(db, requestId);
    if (editingId === requestId) resetEditor();
    if (pickerSelectedId === requestId) onPickerSelectedIdChange?.(null);
  };

  const onRowPress = (request: ClientRequest) => {
    if (pickerMode && onPickerConfirm) {
      onPickerSelectedIdChange?.(request.id);
      onPickerConfirm(request.id);
      return;
    }
    openEdit(request);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !data ? <ActivityIndicator color={theme.service} /> : null}
        {data && data.length === 0 ? <Text style={styles.empty}>{text.emptyClientRequests}</Text> : null}
        {data?.map((request) => (
          <CatalogEntryRow
            key={request.id}
            title={request.name}
            selected={pickerMode && request.id === pickerSelectedId}
            onPress={() => onRowPress(request)}
            onEdit={pickerMode ? () => openEdit(request) : undefined}
            editLabel={text.editClientRequest}
            onDelete={() => confirmDeleteRow(request)}
            deleteLabel={text.deleteClientRequest}
          />
        ))}

        <Notice text={notice} />
      </ScrollView>

      <CatalogEditorModal visible={mode !== null} onClose={resetEditor}>
        <Text style={styles.formTitle}>
          {mode === 'add' ? text.addClientRequest : text.editClientRequest}
        </Text>
        <Field label={text.clientRequestName} value={name} onChangeText={setName} />
        <View style={styles.formActions}>
          <Button label={text.back} tone="quiet" onPress={resetEditor} />
          <Button
            label={saving ? text.saving : text.saveClientRequest}
            onPress={() => void save()}
            disabled={saving}
          />
        </View>
      </CatalogEditorModal>

      <ConfirmDeleteDialog
        visible={deleteTarget !== null}
        title={text.deleteClientRequest}
        message={deleteTarget ? text.deleteClientRequestConfirm(deleteTarget.name) : ''}
        confirmLabel={text.deleteClientRequest}
        cancelLabel={text.back}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await remove(deleteTarget.id);
          } catch (caught) {
            throw new Error(translateError(caught, text, text.deleteClientRequestFailed));
          }
        }}
      />
    </View>
  );
}