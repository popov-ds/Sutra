import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/ui/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function CatalogEditorModal({ visible, onClose, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.card}>
          <View style={styles.inner}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 26, 23, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: theme.white,
    borderColor: theme.line,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 420,
    width: '100%',
  },
  inner: { gap: 12, padding: 16 },
});