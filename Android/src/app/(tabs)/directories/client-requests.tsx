import { useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStrings } from '@/i18n/LanguageProvider';
import { ClientRequestCatalog } from '@/ui/catalog/ClientRequestCatalog';
import { SettingsHeaderButton } from '@/ui/SettingsHeaderButton';
import { theme } from '@/ui/theme';

export default function DirectoryClientRequestsScreen() {
  const navigation = useNavigation();
  const text = useStrings();
  const [addTick, setAddTick] = useState(0);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" onPress={() => setAddTick((t) => t + 1)} style={styles.link}>
            <Text style={styles.linkText}>{text.add}</Text>
          </Pressable>
          <SettingsHeaderButton />
        </View>
      ),
    });
  }, [navigation, text]);

  return <ClientRequestCatalog addRequestTick={addTick} />;
}

const styles = StyleSheet.create({
  headerActions: { alignItems: 'center', flexDirection: 'row' },
  link: { paddingHorizontal: 16, paddingVertical: 8 },
  linkText: { color: theme.service, fontSize: 16, fontWeight: '700' },
});