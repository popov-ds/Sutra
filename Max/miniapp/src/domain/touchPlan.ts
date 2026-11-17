import { assertCourseDuration } from "./catalog.js";
import { addCalendarDays, assertIsoDate, formatRuDate } from "./dates.js";
import { createId } from "./ids.js";
import type { ClientStatus } from "./validate.js";

export const REORDER_LEAD_DAYS = 4;
export const PARTNERSHIP_WINDOW_DAYS = 21;

type TaskCategory = "service" | "upsell" | "partnership";
type TaskType =
  | "service_usage"
  | "control_checkin"
  | "result_checkpoint"
  | "cross_sell"
  | "reorder_reminder"
  | "partnership_offer";
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
  title: string;
};

export const PURCHASE_CASCADE: readonly CascadeStep[] = [
  {
    offsetDays: 0,
    type: "service_usage",
    category: "service",
    title: "Сервис: Объяснить, как пользоваться продуктом и как его хранить",
  },
  {
    offsetDays: 3,
    type: "control_checkin",
    category: "service",
    title: "Контроль: Уточнить впечатление от продукта и ответить на вопросы",
  },
  {
    offsetDays: 7,
    type: "result_checkpoint",
    category: "service",
    title: "Результат: Спросить об эффекте или обратной связи",
  },
  {
    offsetDays: 15,
    type: "cross_sell",
    category: "upsell",
    title: "Кросс-селл: Предложить дополнительный продукт из вашего каталога",
  },
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
      title: step.title,
      details: cascadeDetails(step.type, input.product.name),
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
    title: "Напомнить о заказе, продукт скоро закончится",
    details: `«${input.product.name}»: период ${durationDays} дн., расчетное окончание ${formatRuDate(endsOn)}.`,
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
  const idGen = input.createId ?? createId;
  const changedOn = assertIsoDate(input.changedOn);
  return draftTask({
    id: idGen(),
    clientId: input.clientId,
    purchaseId: null,
    touchOn: addCalendarDays(changedOn, PARTNERSHIP_WINDOW_DAYS),
    type: "partnership_offer",
    category: "partnership",
    title: "Окно партнерства: Сделать бизнес-предложение",
    details: `Статус «Постоянный клиент» установлен ${formatRuDate(changedOn)}. Задача ставится через 21 день и только при переводе в этот статус.`,
    source: "partnership_window",
    dedupeKey: `client:${input.clientId}:partnership_offer:${changedOn}`,
  });
}

function cascadeDetails(type: TaskType, productName: string): string {
  if (type === "cross_sell") {
    return `После «${productName}». Уточнить, что ещё может пригодиться, и предложить другой продукт из каталога — не повтор текущей покупки.`;
  }
  if (type === "service_usage") {
    return `Продукт «${productName}». Показать, как пользоваться и как хранить.`;
  }
  if (type === "control_checkin") {
    return `Продукт «${productName}». Спросить, всё ли понятно и устраивает ли результат на этом этапе.`;
  }
  return `Продукт «${productName}». Зафиксировать обратную связь словами клиента.`;
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