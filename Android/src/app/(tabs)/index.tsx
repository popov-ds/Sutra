import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { completeTask, loadDayBoard } from '@/data/tasks';
import { addCalendarDays, formatLongDate, formatRuDate, todayIso } from '@/domain/dates';
import { TASK_CATEGORIES } from '@/domain/types';
import { useLanguage } from '@/i18n/LanguageProvider';
import { NotificationsDisabledBanner } from '@/ui/NotificationsDisabledBanner';
import { theme } from '@/ui/theme';
import { TaskCard } from '@/ui/ui';
import { useLoader } from '@/ui/useLoader';

export default function TodayScreen() {
  const db = useSQLiteContext();
  const { language, text } = useLanguage();
  const [day, setDay] = useState(todayIso);
  const { data, error, loading } = useLoader(day, () => loadDayBoard(db, day));
  const today = data?.today ?? todayIso();

  return (
    <View style={styles.root}>
      <View style={styles.pagerBar}>
        <View style={styles.pager}>
          <PagerButton label="‹" onPress={() => setDay((current) => addCalendarDays(current, -1))} />
          <Pressable onPress={() => setDay(today)} style={styles.dayButton}>
            <Text style={styles.dayTitle}>{day === today ? text.today : formatLongDate(day, language)}</Text>
            <Text style={styles.daySub}>{formatRuDate(day)}</Text>
          </Pressable>
          <PagerButton label="›" onPress={() => setDay((current) => addCalendarDays(current, 1))} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <NotificationsDisabledBanner />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !data ? <ActivityIndicator color={theme.service} /> : null}

        {data && day === today && data.overdue.length > 0 ? (
          <View style={styles.group}>
            <Text style={styles.overdueTitle}>{text.overdue(data.overdue.length)}</Text>
            {data.overdue.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                today={today}
                onOpen={() => router.push({ pathname: '/client/[id]', params: { id: task.clientId } })}
                onComplete={() => {
                  void completeTask(db, task.id).catch((caught: unknown) => {
                    console.warn(caught);
                  });
                }}
              />
            ))}
          </View>
        ) : null}

        {data && data.tasks.length === 0 ? <Text style={styles.empty}>{text.noTouches}</Text> : null}

        {data
          ? TASK_CATEGORIES.map((category) => {
              const tasks = data.tasks.filter((task) => task.category === category);
              if (tasks.length === 0) return null;
              return (
                <View key={category} style={styles.group}>
                  <Text style={styles.groupTitle}>{text.category[category]}</Text>
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      today={today}
                      onOpen={() => router.push({ pathname: '/client/[id]', params: { id: task.clientId } })}
                      onComplete={() => {
                        void completeTask(db, task.id).catch((caught: unknown) => {
                          console.warn(caught);
                        });
                      }}
                    />
                  ))}
                </View>
              );
            })
          : null}
      </ScrollView>
    </View>
  );
}

function PagerButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.pagerButton}>
      <Text style={styles.pagerLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: theme.bg, flex: 1 },
  pagerBar: {
    backgroundColor: theme.bg,
    borderBottomColor: theme.line,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  content: { gap: 16, padding: 16, paddingBottom: 32 },
  pager: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  pagerButton: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  pagerLabel: { color: theme.ink, fontSize: 24, lineHeight: 28 },
  dayButton: { alignItems: 'center', flex: 1 },
  dayTitle: { color: theme.ink, fontSize: 20, fontWeight: '700' },
  daySub: { color: theme.muted, fontSize: 13 },
  group: { gap: 10 },
  groupTitle: { color: theme.ink, fontSize: 18, fontWeight: '700' },
  overdueTitle: { color: theme.danger, fontSize: 18, fontWeight: '700' },
  empty: { color: theme.muted, fontSize: 16, lineHeight: 22 },
  error: { color: theme.danger, fontSize: 15 },
});