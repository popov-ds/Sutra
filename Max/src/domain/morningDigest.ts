import type { AppLanguage } from "../bot/i18n.js";
import { formatLongDate } from "./digestDates.js";
import type { TaskTypeKey } from "./taskTitles.js";

export const DIGEST_TASK_LIMIT = 6;

export type DigestTask = {
  clientName: string;
  title: string;
  productName: string | null;
  type: TaskTypeKey | string;
};

type DigestCopy = {
  title: string;
  more: (count: number) => string;
};

export function buildMorningDigest(
  day: string,
  tasks: DigestTask[],
  lang: AppLanguage,
  copy?: DigestCopy,
): { title: string; body: string } | null {
  if (tasks.length === 0) return null;

  const lines = tasks.slice(0, DIGEST_TASK_LIMIT).map((task) => {
    const product = task.productName ? `, ${task.productName}` : "";
    return `• ${task.clientName}${product}: ${task.title}`;
  });
  const hidden = tasks.length - DIGEST_TASK_LIMIT;
  if (hidden > 0) {
    lines.push(
      copy
        ? copy.more(hidden)
        : lang === "en"
          ? `• and ${hidden} more`
          : `• и ещё ${hidden}`,
    );
  }

  const defaultTitle =
    lang === "en" ? `Touches on ${formatLongDate(day, "en")}` : `Касания на ${formatLongDate(day, "ru")}`;

  return {
    title: copy?.title ?? defaultTitle,
    body: lines.join("\n"),
  };
}

export function digestCopy(lang: AppLanguage, day: string): { title: string; more: (n: number) => string } {
  return {
    title:
      lang === "en"
        ? `Touches on ${formatLongDate(day, "en")}`
        : `Касания на ${formatLongDate(day, "ru")}`,
    more: (n) => (lang === "en" ? `• and ${n} more` : `• и ещё ${n}`),
  };
}