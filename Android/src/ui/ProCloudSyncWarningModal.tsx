import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/ui/theme';

type ProCloudSyncWarningModalProps = {
  visible: boolean;
  message: string;
  closeLabel: string;
  onClose: () => void;
};

export function ProCloudSyncWarningModal({
  visible,
  message,
  closeLabel,
  onClose,
}: ProCloudSyncWarningModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>{closeLabel}</Text>
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
    gap: 16,
    maxWidth: 400,
    padding: 20,
    width: '100%',
  },
  message: {
    color: theme.danger,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
  },
  actions: { alignItems: 'center' },
  close: {
    backgroundColor: theme.service,
    borderRadius: 10,
    minWidth: 140,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeText: { color: theme.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});