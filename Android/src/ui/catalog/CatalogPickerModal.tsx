import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BannerLayoutProvider } from '@/ads/BannerLayoutProvider';
import { FreeTierBannerDock } from '@/ads/FreeTierBannerDock';
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
  const [addTick, setAddTick] = useState(0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <BannerLayoutProvider>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={text.back} onPress={onClose} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={26} color={theme.ink} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setAddTick((t) => t + 1)}
            hitSlop={8}
            style={styles.headerAdd}
          >
            <Text style={styles.headerAddText}>{text.add}</Text>
          </Pressable>
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
        <View style={styles.body}>
          {kind === 'product' ? (
            <ProductCatalog
              addRequestTick={addTick}
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
              addRequestTick={addTick}
              pickerMode
              pickerSelectedId={selectedId}
              onPickerSelectedIdChange={onSelectedIdChange}
              onPickerConfirm={(id) => {
                onConfirm(id);
                onClose();
              }}
            />
          )}
        </View>
        <FreeTierBannerDock />
        </BannerLayoutProvider>
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
  headerAdd: { paddingHorizontal: 8, paddingVertical: 6 },
  headerAddText: { color: theme.service, fontSize: 16, fontWeight: '700' },
  clearRow: { paddingHorizontal: 16, paddingTop: 8 },
  body: { flex: 1 },
});
