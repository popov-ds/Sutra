import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/ui/theme';

type ConfirmDeleteDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmDeleteDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setError(null);
    onCancel();
  };

  const confirm = () => {
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        await onConfirm();
        setBusy(false);
        onCancel();
      } catch (caught) {
        setBusy(false);
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    })();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={close} style={styles.cancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={confirm} style={styles.delete}>
              <Text style={styles.deleteText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 28, 24, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    backgroundColor: theme.white,
    borderColor: theme.line,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    maxWidth: 400,
    padding: 18,
    width: '100%',
  },
  title: { color: theme.ink, fontSize: 18, fontWeight: '700' },
  message: { color: theme.ink, fontSize: 15, lineHeight: 21 },
  error: { color: theme.danger, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  cancel: { paddingHorizontal: 12, paddingVertical: 10 },
  cancelText: { color: theme.muted, fontSize: 16, fontWeight: '600' },
  delete: {
    backgroundColor: theme.danger,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  deleteText: { color: theme.white, fontSize: 16, fontWeight: '700' },
});