import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/ui/theme';

type ProCloudSyncWarningModalProps = {
  visible: boolean;
  message: string;
  closeLabel: string;
  dontShowAgainLabel: string;
  onClose: (dontShowAgain: boolean) => void;
};

export function ProCloudSyncWarningModal({
  visible,
  message,
  closeLabel,
  dontShowAgainLabel,
  onClose,
}: ProCloudSyncWarningModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const dismiss = () => {
    onClose(dontShowAgain);
    setDontShowAgain(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      onShow={() => setDontShowAgain(false)}
    >
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.message}>{message}</Text>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: dontShowAgain }}
            onPress={() => setDontShowAgain((v) => !v)}
            style={styles.checkRow}
          >
            <View style={[styles.checkBox, dontShowAgain && styles.checkBoxOn]}>
              {dontShowAgain ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>{dontShowAgainLabel}</Text>
          </Pressable>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={dismiss} style={styles.close}>
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
    gap: 12,
    maxWidth: 400,
    padding: 20,
    width: '100%',
  },
  message: {
    color: '#6F1D1D',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },
  checkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  checkBox: {
    alignItems: 'center',
    borderColor: theme.line,
    borderRadius: 4,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkBoxOn: {
    backgroundColor: theme.service,
    borderColor: theme.service,
  },
  checkMark: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  checkLabel: {
    color: theme.ink,
    fontSize: 15,
    fontWeight: '500',
  },
  actions: { alignItems: 'center', marginTop: 4 },
  close: {
    backgroundColor: theme.service,
    borderRadius: 10,
    minWidth: 140,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeText: { color: theme.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});