import { assertIsoDate, formatRuDateLong } from './dates';
import type { TaskCategory } from './types';

export const MORNING_DIGEST_HOUR = 9;
export const DIGEST_HORIZON_DAYS = 14;
export const DIGEST_TASK_LIMIT = 6;

export type DigestTask = {
  clientName: string;
  title: string;
  category: TaskCategory;
  productName: string | null;
};

export function morningDigestMoment(day: string, hour = MORNING_DIGEST_HOUR): Date {
  const [year, month, date] = assertIsoDate(day).split('-').map(Number);
  return new Date(year, month - 1, date, hour, 0, 0, 0);
}

export function isDigestStillAhead(day: string, now: Date, hour = MORNING_DIGEST_HOUR): boolean {
  return morningDigestMoment(day, hour).getTime() > now.getTime();
}

type DigestCopy = {
  title: string;
  more: (count: number) => string;
};

export function buildMorningDigest(
  day: string,
  tasks: DigestTask[],
  copy?: DigestCopy,
): { title: string; body: string } | null {
  if (tasks.length === 0) return null;

  const lines = tasks.slice(0, DIGEST_TASK_LIMIT).map((task) => {
    const product = task.productName ? `, ${task.productName}` : '';
    return `• ${task.clientName}${product}: ${task.title}`;
  });
  const hidden = tasks.length - DIGEST_TASK_LIMIT;
  if (hidden > 0) lines.push(copy ? copy.more(hidden) : `• и ещё ${hidden}`);

  return {
    title: copy?.title ?? `Касания на ${formatRuDateLong(day)}`,
    body: lines.join('\n'),
  };
}
