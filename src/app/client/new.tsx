import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createClient } from '@/data/clients';
import { CLIENT_STATUSES, type ClientStatus } from '@/domain/types';
import { useStrings } from '@/i18n/LanguageProvider';
import { translateError } from '@/i18n/text';
import { theme } from '@/ui/theme';
import { Button, Field, Notice } from '@/ui/ui';

export default function NewClientScreen() {
  const db = useSQLiteContext();
  const text = useStrings();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<ClientStatus>('newbie');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const client = await createClient(db, {
        name,
        phone,
        status,
      });
      router.replace({ pathname: '/client/[id]', params: { id: client.id } });
    } catch (caught) {
      setError(translateError(caught, text, text.saveClientFailed));
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: text.newClient }} />
      <Field label={text.name} value={name} onChangeText={setName} placeholder="Анна" />
      <Field label={text.phone} value={phone} onChangeText={setPhone} placeholder="+7 900 000-00-00" keyboardType="phone-pad" />
      <View style={styles.field}>
        <Text style={styles.label}>{text.status}</Text>
        <View style={styles.tags}>
          {CLIENT_STATUSES.map((item) => {
            const selected = item === status;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={text.statusLabel[item]}
                accessibilityState={{ selected }}
                onPress={() => setStatus(item)}
                style={[styles.chip, selected && styles.chipOn]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>{text.statusLabel[item]}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>
          {text.partnershipLater}
        </Text>
      </View>
      <Notice text={error} />
      <Button label={saving ? text.saving : text.createClient} onPress={() => void save()} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: 16, paddingBottom: 40 },
  field: { gap: 8 },
  label: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: theme.white, borderColor: theme.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  chipText: { color: theme.ink, fontSize: 14 },
  chipTextOn: { color: theme.white, fontWeight: '700' },
  hint: { color: theme.muted, fontSize: 13, lineHeight: 18 },
});
