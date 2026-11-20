import type { MeResponse } from "../api.js";
import {
  completeTask,
  countClients,
  loadDayBoard,
  persistLocalChanges,
} from "../db/localDb.js";
import { todayIso } from "../domain/dates.js";
import type { UiStrings } from "../i18n.js";
import { setScreenChrome, splitLayout } from "../ui/screenChrome.js";
import { taskCardHtml } from "../ui/taskCard.js";

function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function formatDayTitle(day: string, today: string, t: UiStrings, lang: string): string {
  if (day === today) return t.today;
  const [y, m, d] = day.split("-").map(Number);
  const locale = lang === "en" ? "en-GB" : "ru-RU";
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

export type TodayViewState = { day: string };

export async function renderTodayView(
  screen: HTMLElement,
  me: MeResponse,
  t: UiStrings,
  state: TodayViewState,
  onDayChange: (day: string) => void,
  onOpenClient?: (clientId: string) => void,
): Promise<void> {
  screen.dataset.dirView = "";
  setScreenChrome(screen, "split");
  const today = todayIso();
  const { tasks, overdue } = await loadDayBoard(state.day, today);
  const clientCount = await countClients();

  const limit = me.tier === "free" ? me.freeRecordLimit : null;
  const head = `<div class="day-pager">
      <button type="button" class="pager-btn" data-day-delta="-1" aria-label="${escapeAttr(t.prevDay)}">‹</button>
      <button type="button" class="day-pager-title" data-day-reset="1">${escapeHtml(formatDayTitle(state.day, today, t, me.language))}</button>
      <button type="button" class="pager-btn" data-day-delta="1" aria-label="${escapeAttr(t.nextDay)}">›</button>
    </div>`;

  const bodyParts: string[] = [`<p class="muted">${t.clientsCount(clientCount, limit)}</p>`];

  if (state.day === today && overdue.length > 0) {
    bodyParts.push(`<h2 class="section-title section-title--overdue">${escapeHtml(t.overdue(overdue.length))}</h2>`);
    bodyParts.push(overdue.map((task) => taskCardHtml(task, today, t, me.language, { showComplete: true })).join(""));
  }

  if (tasks.length === 0 && !(state.day === today && overdue.length > 0)) {
    bodyParts.push(`<p class="muted">${t.noTouches}</p>`);
  } else if (tasks.length > 0) {
    const order = ["service", "upsell", "partnership"];
    let lastCat = "";
    for (const cat of order) {
      const bucket = tasks.filter((task) => task.category === cat);
      if (bucket.length === 0) continue;
      const catLabel = t.category[cat] ?? cat;
      if (catLabel !== lastCat) {
        bodyParts.push(`<h2 class="section-title">${escapeHtml(catLabel)}</h2>`);
        lastCat = catLabel;
      }
      bodyParts.push(bucket.map((task) => taskCardHtml(task, today, t, me.language, { showComplete: true })).join(""));
    }
  }

  screen.innerHTML = splitLayout(head, bodyParts.join(""));

  screen.querySelectorAll("[data-day-delta]").forEach((el) => {
    el.addEventListener("click", () => {
      const delta = Number((el as HTMLElement).dataset.dayDelta);
      onDayChange(addDays(state.day, delta));
    });
  });
  screen.querySelector("[data-day-reset]")?.addEventListener("click", () => onDayChange(today));

  screen.querySelectorAll("[data-complete]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      void (async () => {
        const id = (el as HTMLElement).dataset.complete!;
        await completeTask(id);
        await persistLocalChanges();
        await renderTodayView(screen, me, t, state, onDayChange, onOpenClient);
      })();
    });
  });

  if (onOpenClient) {
    screen.querySelectorAll("[data-open-client]").forEach((el) => {
      el.addEventListener("click", (ev) => {
        const target = ev.target as HTMLElement;
        if (target.closest("[data-complete]")) return;
        onOpenClient((el as HTMLElement).dataset.openClient!);
      });
    });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}