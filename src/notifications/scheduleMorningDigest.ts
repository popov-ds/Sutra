import type { SQLiteDatabase } from 'expo-sqlite';
import {
  AndroidImportance,
  SchedulableTriggerInputTypes,
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { peekLanguage } from '@/data/settings';
import { addCalendarDays, formatLongDate, todayIso } from '@/domain/dates';
import {
  buildMorningDigest,
  DIGEST_HORIZON_DAYS,
  isDigestStillAhead,
  morningDigestMoment,
  type DigestTask,
} from '@/domain/morningDigest';
import { listDigestTasks } from '@/data/tasks';
import { textOf } from '@/i18n/text';

const DIGEST_KIND = 'morning-digest';
const CHANNEL_ID = 'morning-digest';

let handlerReady = false;
let tail: Promise<void> = Promise.resolve();

export function syncMorningDigests(db: SQLiteDatabase): Promise<void> {
  const run = tail.then(() => syncNow(db));
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function syncNow(db: SQLiteDatabase): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const today = todayIso();
    const language = peekLanguage();
    const text = textOf(language);
    const lastDay = addCalendarDays(today, DIGEST_HORIZON_DAYS - 1);
    const rows = await listDigestTasks(db, today, lastDay);
    const now = new Date();
    const planned = groupByDay(rows, text)
      .map((group) => {
        const digest = buildMorningDigest(group.day, group.tasks, {
          title: text.digestTitle(formatLongDate(group.day, language)),
          more: text.digestMore,
        });
        if (!digest || !isDigestStillAhead(group.day, now)) return null;
        return { day: group.day, ...digest, when: morningDigestMoment(group.day) };
      })
      .filter((item): item is { day: string; title: string; body: string; when: Date } => item !== null);

    const allowed = await ensurePermission(planned.length > 0);
    if (!allowed) return;

    ensureHandler();
    if (Platform.OS === 'android') {
      await setNotificationChannelAsync(CHANNEL_ID, {
        name: text.notificationChannel,
        importance: AndroidImportance.DEFAULT,
      });
    }

    await cancelDigests();
    for (const item of planned) {
      await scheduleNotificationAsync({
        content: {
          title: item.title,
          body: item.body,
          data: { kind: DIGEST_KIND, touchOn: item.day },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: item.when,
          channelId: CHANNEL_ID,
        },
      });
    }
  } catch (error) {
    console.warn('Не удалось обновить утренние уведомления', error);
  }
}

function groupByDay(
  rows: Awaited<ReturnType<typeof listDigestTasks>>,
  text: ReturnType<typeof textOf>,
): { day: string; tasks: DigestTask[] }[] {
  const groups = new Map<string, DigestTask[]>();
  for (const row of rows) {
    const tasks = groups.get(row.touchOn) ?? [];
    tasks.push({
      clientName: row.clientName,
      title: text.taskTitle[row.type],
      category: row.category,
      productName: row.productName,
    });
    groups.set(row.touchOn, tasks);
  }
  return [...groups.entries()].map(([day, tasks]) => ({ day, tasks }));
}

async function ensurePermission(needsPrompt: boolean): Promise<boolean> {
  const current = await getPermissionsAsync();
  if (current.granted) return true;
  if (!needsPrompt || !current.canAskAgain) return false;
  const asked = await requestPermissionsAsync();
  return asked.granted;
}

function ensureHandler(): void {
  if (handlerReady) return;
  handlerReady = true;
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function cancelDigests(): Promise<void> {
  const scheduled = await getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.content.data?.kind === DIGEST_KIND)
      .map((request) => cancelScheduledNotificationAsync(request.identifier)),
  );
}
