import type { TaskListItem } from "../db/localDb.js";
import { formatLocaleDate } from "../domain/dates.js";
import { effectiveStatus } from "../domain/taskStatus.js";
import { taskDisplayTitle, type AppLanguage, type UiStrings } from "../i18n.js";

const CATEGORY_CLASS: Record<string, string> = {
  service: "cat-service",
  upsell: "cat-upsell",
  partnership: "cat-partnership",
};

export function taskCardHtml(
  task: TaskListItem,
  today: string,
  t: UiStrings,
  lang: AppLanguage,
  options: { showComplete?: boolean; dataOpenClient?: string } = {},
): string {
  const status = effectiveStatus(task.status as "pending" | "done" | "overdue", task.touchOn, today);
  const done = status === "done";
  const catClass = CATEGORY_CLASS[task.category] ?? "cat-service";
  const catLabel = t.category[task.category] ?? task.category;
  const statusLabel = t.taskStatus[status] ?? status;
  const openAttr = options.dataOpenClient
    ? ` data-open-client="${escapeAttr(options.dataOpenClient)}"`
    : ` data-open-client="${escapeAttr(task.clientId)}"`;

  return `<article class="task-card ${done ? "task-card--done" : ""} ${catClass}" data-task-id="${escapeAttr(task.id)}"${openAttr}>
    <div class="task-card-top">
      <span class="task-cat-chip">${escapeHtml(catLabel)}</span>
      <span class="task-status ${status === "overdue" ? "task-status--overdue" : ""}">${escapeHtml(statusLabel)}</span>
    </div>
    <p class="task-card-meta">${escapeHtml(formatLocaleDate(task.touchOn, lang))}${task.clientName ? ` · ${escapeHtml(task.clientName)}` : ""}${task.productName ? ` · ${escapeHtml(task.productName)}` : ""}</p>
    <p class="task-card-title">${escapeHtml(taskDisplayTitle(t, task.type, task.title))}</p>
    ${task.details ? `<p class="task-card-details">${escapeHtml(task.details)}</p>` : ""}
    ${options.showComplete && !done ? `<button type="button" class="btn-quiet" data-complete="${escapeAttr(task.id)}">${escapeHtml(t.complete)}</button>` : ""}
  </article>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}