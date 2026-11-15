import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { deleteClient, listClients } from '@/data/clients';
import { useStrings } from '@/i18n/LanguageProvider';
import { translateError } from '@/i18n/text';
import { theme } from '@/ui/theme';
import { useLoader } from '@/ui/useLoader';

export default function ClientsScreen() {
  const db = useSQLiteContext();
  const text = useStrings();
  const { data, error, loading } = useLoader('clients', () => listClients(db));
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ru');
    const clients = data ?? [];
    if (!needle) return clients;
    return clients.filter((client) => {
      const haystack = [client.name, client.phone].join(' ').toLocaleLowerCase('ru');
      return haystack.includes(needle);
    });
  }, [data, query]);

  const confirmDelete = (clientId: string, name: string) => {
    Alert.alert(text.deleteClient, text.deleteClientConfirm(name), [
      { text: text.back, style: 'cancel' },
      {
        text: text.deleteClient,
        style: 'destructive',
        onPress: () =>
          void deleteClient(db, clientId).catch((caught) => {
            Alert.alert(text.deleteClient, translateError(caught, text, text.deleteClientFailed));
          }),
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={text.searchClients}
        placeholderTextColor={theme.muted}
        style={styles.search}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && !data ? <ActivityIndicator color={theme.service} /> : null}
      {data && visible.length === 0 ? (
        <Text style={styles.empty}>
          {data.length === 0 ? text.emptyClients : text.noSearchHits}
        </Text>
      ) : null}
      {visible.map((client) => (
        <View key={client.id} style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/client/[id]', params: { id: client.id } })}
            style={styles.cardBody}
          >
            <Text style={styles.name}>{client.name}</Text>
            <Text style={styles.meta}>
              {text.statusLabel[client.status]}
              {client.phone ? ` · ${client.phone}` : ''}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text.deleteClient}
            hitSlop={8}
            onPress={() => confirmDelete(client.id, client.name)}
            style={styles.delete}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={22} color={theme.danger} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 32 },
  search: {
    backgroundColor: theme.white,
    borderColor: theme.line,
    borderRadius: 12,
    borderWidth: 1,
    color: theme.ink,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  card: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingRight: 8,
  },
  cardBody: { flex: 1, gap: 4, padding: 14 },
  delete: { padding: 10 },
  name: { color: theme.ink, fontSize: 17, fontWeight: '700' },
  meta: { color: theme.muted, fontSize: 14 },
  empty: { color: theme.muted, fontSize: 16, lineHeight: 22 },
  error: { color: theme.danger },
});
