import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStrings } from '@/i18n/LanguageProvider';
import { Button } from '@/ui/ui';
import { theme } from '@/ui/theme';

import { ClientRequestCatalog } from './ClientRequestCatalog';
import { ProductCatalog } from './ProductCatalog';

export type CatalogPickerKind = 'product' | 'clientRequest';

type CatalogPickerModalProps = {
  visible: boolean;
  kind: CatalogPickerKind;
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  onClose: () => void;
  onConfirm: (id: string) => void;
  allowClear?: boolean;
  onClear?: () => void;
};

export function CatalogPickerModal({
  visible,
  kind,
  selectedId,
  onSelectedIdChange,
  onClose,
  onConfirm,
  allowClear,
  onClear,
}: CatalogPickerModalProps) {
  const text = useStrings();
  const title = kind === 'product' ? text.productLabel : text.clientRequestLabel;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={text.back} onPress={onClose} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={26} color={theme.ink} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>
        {allowClear && onClear ? (
          <View style={styles.clearRow}>
            <Button
              label={text.clearSelection}
              tone="quiet"
              onPress={() => {
                onClear();
                onClose();
              }}
            />
          </View>
        ) : null}
        {kind === 'product' ? (
          <ProductCatalog
            pickerMode
            pickerSelectedId={selectedId}
            onPickerSelectedIdChange={onSelectedIdChange}
            onPickerConfirm={(id) => {
              onConfirm(id);
              onClose();
            }}
          />
        ) : (
          <ClientRequestCatalog
            pickerMode
            pickerSelectedId={selectedId}
            onPickerSelectedIdChange={onSelectedIdChange}
            onPickerConfirm={(id) => {
              onConfirm(id);
              onClose();
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.bg, flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: theme.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: { color: theme.ink, fontSize: 17, fontWeight: '700' },
  headerSpacer: { width: 26 },
  clearRow: { paddingHorizontal: 16, paddingTop: 8 },
});
