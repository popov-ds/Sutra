import { assertCourseDuration } from "./catalog.js";
import { addCalendarDays, assertIsoDate, formatLocaleDate } from "./dates.js";
import { createId } from "./ids.js";
import { strings } from "../i18n.js";
import { getAppLanguage } from "../localeContext.js";
import type { ClientStatus } from "./validate.js";
import type { TaskTypeKey } from "../i18n.js";

export const REORDER_LEAD_DAYS = 4;
export const PARTNERSHIP_WINDOW_DAYS = 21;

type TaskCategory = "service" | "upsell" | "partnership";
type TaskType = TaskTypeKey;
type TaskSource = "purchase_cascade" | "reorder" | "partnership_window";

export type TaskDraft = {
  id: string;
  clientId: string;
  purchaseId: string | null;
  touchOn: string;
  type: TaskType;
  category: TaskCategory;
  title: string;
  details: string;
  status: "pending";
  source: TaskSource;
  dedupeKey: string;
};

type CascadeStep = {
  offsetDays: number;
  type: TaskType;
  category: TaskCategory;
  titleKey: TaskType;
};

const PURCHASE_CASCADE: readonly CascadeStep[] = [
  { offsetDays: 0, type: "service_usage", category: "service", titleKey: "service_usage" },
  { offsetDays: 3, type: "control_checkin", category: "service", titleKey: "control_checkin" },
  { offsetDays: 7, type: "result_checkpoint", category: "service", titleKey: "result_checkpoint" },
  { offsetDays: 15, type: "cross_sell", category: "upsell", titleKey: "cross_sell" },
];

export function courseEndsOn(purchasedOn: string, durationDays: number): string {
  return addCalendarDays(assertIsoDate(purchasedOn), assertCourseDuration(durationDays));
}

export function reorderOffsetDays(durationDays: number): number {
  return Math.max(0, assertCourseDuration(durationDays) - REORDER_LEAD_DAYS);
}

export function reorderTouchOn(purchasedOn: string, durationDays: number): string {
  return addCalendarDays(assertIsoDate(purchasedOn), reorderOffsetDays(durationDays));
}

export function buildPurchaseTasks(input: {
  purchaseId: string;
  clientId: string;
  product: { name: string; durationDays: number };
  purchasedOn: string;
  createId?: () => string;
}): TaskDraft[] {
  const t = strings(getAppLanguage());
  const lang = getAppLanguage();
  const idGen = input.createId ?? createId;
  const purchasedOn = assertIsoDate(input.purchasedOn);
  const durationDays = assertCourseDuration(input.product.durationDays);
  const endsOn = courseEndsOn(purchasedOn, durationDays);

  const cascade = PURCHASE_CASCADE.map((step) =>
    draftTask({
      id: idGen(),
      clientId: input.clientId,
      purchaseId: input.purchaseId,
      touchOn: addCalendarDays(purchasedOn, step.offsetDays),
      type: step.type,
      category: step.category,
      title: t.taskTitles[step.titleKey],
      details: cascadeDetails(step.type, input.product.name, t),
      source: "purchase_cascade",
      dedupeKey: `purchase:${input.purchaseId}:${step.type}`,
    }),
  );

  const reorder = draftTask({
    id: idGen(),
    clientId: input.clientId,
    purchaseId: input.purchaseId,
    touchOn: reorderTouchOn(purchasedOn, durationDays),
    type: "reorder_reminder",
    category: "upsell",
    title: t.taskTitles.reorder_reminder,
    details: t.taskDetailFns.reorder(
      input.product.name,
      durationDays,
      formatLocaleDate(endsOn, lang),
    ),
    source: "reorder",
    dedupeKey: `purchase:${input.purchaseId}:reorder_reminder`,
  });

  return sortTasks([...cascade, reorder]);
}

export function shouldSchedulePartnershipWindow(previous: ClientStatus, next: ClientStatus): boolean {
  return previous !== "regular" && next === "regular";
}

export function shouldCancelPartnershipWindow(previous: ClientStatus, next: ClientStatus): boolean {
  return previous === "regular" && next !== "regular";
}

export function buildPartnershipTask(input: {
  clientId: string;
  changedOn: string;
  createId?: () => string;
}): TaskDraft {
  const t = strings(getAppLanguage());
  const lang = getAppLanguage();
  const idGen = input.createId ?? createId;
  const changedOn = assertIsoDate(input.changedOn);
  return draftTask({
    id: idGen(),
    clientId: input.clientId,
    purchaseId: null,
    touchOn: addCalendarDays(changedOn, PARTNERSHIP_WINDOW_DAYS),
    type: "partnership_offer",
    category: "partnership",
    title: t.taskTitles.partnership_offer,
    details: t.taskDetailFns.partnership(formatLocaleDate(changedOn, lang)),
    source: "partnership_window",
    dedupeKey: `client:${input.clientId}:partnership_offer:${changedOn}`,
  });
}

function cascadeDetails(
  type: TaskType,
  productName: string,
  t: ReturnType<typeof strings>,
): string {
  if (type === "cross_sell") return t.taskDetailFns.cross_sell(productName);
  if (type === "service_usage") return t.taskDetailFns.service_usage(productName);
  if (type === "control_checkin") return t.taskDetailFns.control_checkin(productName);
  return t.taskDetailFns.result_default(productName);
}

function draftTask(input: Omit<TaskDraft, "status">): TaskDraft {
  return { ...input, status: "pending" };
}

function sortTasks(tasks: TaskDraft[]): TaskDraft[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => a.task.touchOn.localeCompare(b.task.touchOn) || a.index - b.index)
    .map((item) => item.task);
}