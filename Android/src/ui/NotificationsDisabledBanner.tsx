import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNotificationAccess } from '@/notifications/useNotificationAccess';
import { syncMorningDigests } from '@/notifications/scheduleMorningDigest';
import { useSubscription } from '@/subscription/SubscriptionProvider';
import { useStrings } from '@/i18n/LanguageProvider';
import { theme } from '@/ui/theme';

export function NotificationsDisabledBanner() {
  const text = useStrings();
  const db = useSQLiteContext();
  const { isPro } = useSubscription();
  const { access, prompt } = useNotificationAccess();

  if (!isPro || access !== 'denied') return null;

  const onEnable = () => {
    void prompt().then((next) => {
      if (next === 'granted') void syncMorningDigests(db, { pro: true });
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{text.notificationsDisabledTitle}</Text>
      <Text style={styles.body}>{text.notificationsDisabledBody}</Text>
      <Pressable accessibilityRole="button" onPress={onEnable} style={styles.button}>
        <Text style={styles.buttonText}>{text.notificationsEnable}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FCE8E8',
    borderColor: theme.danger,
    borderRadius: 16,
    borderWidth: 2,
    gap: 10,
    padding: 14,
  },
  title: { color: theme.danger, fontSize: 17, fontWeight: '800' },
  body: { color: theme.ink, fontSize: 15, lineHeight: 22 },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: theme.danger,
    borderRadius: 10,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: { color: theme.white, fontSize: 15, fontWeight: '700' },
});
