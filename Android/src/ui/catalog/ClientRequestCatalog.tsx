import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

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
import { Button, Field, Notice } from '@/ui/ui';
import { useLoader } from '@/ui/useLoader';

import { CatalogEditorModal } from './CatalogEditorModal';
import { catalogStyles as styles } from './catalogStyles';

type EditorMode = 'add' | 'edit' | null;

type ClientRequestCatalogProps = {
  pickerMode?: boolean;
  pickerSelectedId?: string | null;
  onPickerSelectedIdChange?: (id: string | null) => void;
  onPickerConfirm?: (id: string) => void;
};

export function ClientRequestCatalog({
  pickerMode = false,
  pickerSelectedId,
  onPickerSelectedIdChange,
  onPickerConfirm,
}: ClientRequestCatalogProps) {
  const db = useSQLiteContext();
  const text = useStrings();
  const loaderKey = pickerMode ? 'client-requests-picker' : 'client-requests';
  const { data, error, loading } = useLoader(loaderKey, () => listClientRequests(db));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>(null);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeSelectedId = pickerMode ? (pickerSelectedId ?? null) : selectedId;
  const setActiveSelectedId = pickerMode ? onPickerSelectedIdChange : setSelectedId;

  const selected = data?.find((item) => item.id === activeSelectedId) ?? null;

  const resetEditor = useCallback(() => {
    setMode(null);
    setName('');
    setNotice(null);
  }, []);

  const startAdd = () => {
    setActiveSelectedId?.(null);
    setMode('add');
    setName('');
    setNotice(null);
  };

  const startEdit = () => {
    if (!selected) {
      setNotice(text.selectClientRequestFirst);
      return;
    }
    setMode('edit');
    setName(selected.name);
    setNotice(null);
  };

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      if (mode === 'add') {
        const created = await createClientRequest(db, name);
        setActiveSelectedId?.(created.id);
      } else if (mode === 'edit' && activeSelectedId) {
        await updateClientRequest(db, activeSelectedId, name);
      }
      resetEditor();
    } catch (caught) {
      setNotice(translateError(caught, text, text.saveClientRequestFailed));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!selected) {
      setNotice(text.selectClientRequestFirst);
      return;
    }
    Alert.alert(text.deleteClientRequest, text.deleteClientRequestConfirm(selected.name), [
      { text: text.back, style: 'cancel' },
      {
        text: text.deleteClientRequest,
        style: 'destructive',
        onPress: () => void remove(selected.id),
      },
    ]);
  };

  const remove = async (requestId: string) => {
    setNotice(null);
    try {
      await deleteClientRequest(db, requestId);
      if (activeSelectedId === requestId) setActiveSelectedId?.(null);
      resetEditor();
    } catch (caught) {
      setNotice(translateError(caught, text, text.deleteClientRequestFailed));
    }
  };

  const pickRow = (requestId: string) => {
    if (pickerMode && !mode && onPickerConfirm) {
      if (activeSelectedId === requestId) onPickerConfirm(requestId);
      else setActiveSelectedId?.(requestId);
      return;
    }
    setActiveSelectedId?.(requestId);
    if (mode === 'edit') {
      const request = data?.find((item) => item.id === requestId);
      if (request) setName(request.name);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !data ? <ActivityIndicator color={theme.service} /> : null}
        {data && data.length === 0 ? <Text style={styles.empty}>{text.emptyClientRequests}</Text> : null}
        {data?.map((request) => (
          <RequestRow
            key={request.id}
            request={request}
            selected={request.id === activeSelectedId}
            onPress={() => pickRow(request.id)}
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

      <View style={styles.toolbar}>
        <ToolbarButton label={text.add} onPress={startAdd} />
        <ToolbarButton label={text.editClientRequest} onPress={startEdit} disabled={!selected} />
        <ToolbarButton label={text.deleteClientRequest} onPress={confirmDelete} disabled={!selected} danger />
      </View>

    </View>
  );
}

function RequestRow({
  request,
  selected,
  onPress,
}: {
  request: ClientRequest;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.row, selected && styles.rowOn]}
    >
      <Text style={[styles.rowTitle, selected && styles.rowTitleOn]}>{request.name}</Text>
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
