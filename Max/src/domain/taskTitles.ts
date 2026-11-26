import type { AppLanguage } from "../bot/i18n.js";

export type TaskTypeKey =
  | "service_explain"
  | "service_checkin"
  | "service_feedback"
  | "reorder_reminder"
  | "partnership_offer";

const TITLES: Record<AppLanguage, Record<TaskTypeKey, string>> = {
  ru: {
    service_explain: "Сервис: объяснить приём",
    service_checkin: "Сервис: уточнить, всё ли понятно",
    service_feedback: "Сервис: записать отзыв клиента",
    reorder_reminder: "Напомнить о заказе, продукт скоро закончится",
    partnership_offer: "Окно партнёрства",
  },
  en: {
    service_explain: "Service: explain how to use",
    service_checkin: "Service: check if everything is clear",
    service_feedback: "Service: capture client feedback",
    reorder_reminder: "Remind them to reorder — product running out soon",
    partnership_offer: "Partnership window",
  },
};

export function localizedTaskTitle(type: string, lang: AppLanguage, storedTitle: string): string {
  const map = TITLES[lang];
  if (type in map) return map[type as TaskTypeKey];
  return storedTitle.trim() || type;
}