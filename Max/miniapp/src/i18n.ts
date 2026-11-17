export type AppLanguage = "ru" | "en";

const statusLabelRu = {
  newbie: "Новичок",
  regular: "Постоянный",
  candidate: "Кандидат",
  partner: "Партнёр",
} as const;

const taskStatusRu = {
  pending: "В плане",
  done: "Готово",
  overdue: "Просрочено",
  skipped: "Пропущено",
} as const;

const ru = {
  appTitle: "Sutra",
  today: "Сегодня",
  clients: "Клиенты",
  directories: "Справочники",
  tier: (t: string) => `Тариф: ${t.toUpperCase()}`,
  noTouches: "На этот день касаний нет.",
  overdue: (n: number) => `Просрочено (${n})`,
  clientsCount: (n: number, limit: number | null) =>
    limit != null ? `Клиентов: ${n} / лимит ${limit}` : `Клиентов: ${n}`,
  searchClients: "Поиск по имени или телефону",
  emptyClients: "Пока нет клиентов.",
  noSearchHits: "Ничего не найдено.",
  category: {
    service: "Сервис",
    upsell: "Допродажа",
    partnership: "Партнёрство",
  } as Record<string, string>,
  statusLabel: statusLabelRu,
  taskStatus: taskStatusRu,
  complete: "Готово",
  newClient: "Новый клиент",
  name: "Имя",
  phone: "Телефон",
  call: "Позвонить",
  funnel: "Воронка",
  funnelHint: "Статус «Постоянный» ставит касание партнёрства через 21 день.",
  partnershipLater: "Партнёрское касание появится, если переведёте клиента в «Постоянный».",
  save: "Сохранить",
  createClient: "Создать клиента",
  saveProfile: "Сохранить",
  profileSaved: "Профиль сохранён",
  saving: "Сохранение…",
  partnershipScheduled: (d: string) => `Запланировано партнёрское касание на ${d}.`,
  statusFailed: "Не удалось сменить статус",
  saveFailed: "Не удалось сохранить",
  clientRequestLabel: "Запрос клиента",
  chooseClientRequest: "Выберите запрос",
  clearSelection: "Сбросить",
  additionalInfo: "Доп. информация",
  purchases: "Покупки",
  recordPurchase: "Покупка",
  noPurchases: "Покупок пока нет.",
  deletePurchase: "Удалить покупку",
  deletePurchaseConfirm: (name: string) => `Удалить покупку «${name}»?`,
  purchasedOn: (bought: string, ends: string) => `Куплено ${bought}, окончание курса ${ends}`,
  timeline: "Касания",
  emptyTimeline: "Касаний пока нет.",
  newPurchase: "Новая покупка",
  productLabel: "Продукт",
  chooseProduct: "Выберите продукт",
  purchaseDate: "Дата покупки",
  willCreate: "Будет создано касаний",
  recordPurchaseAction: "Зафиксировать",
  touchesCreated: "Касания созданы",
  touchesCreatedLead: (n: number) => `Создано ${n} касаний по плану после покупки.`,
  done: "Готово",
  durationDays: (d: number) => `${d} дн.`,
  pickerHint: "Нажмите ещё раз на строку, чтобы выбрать",
  add: "Добавить",
  edit: "Изменить",
  delete: "Удалить",
  back: "Назад",
} as const;

const en = {
  ...ru,
  today: "Today",
  clients: "Clients",
  directories: "Directories",
  noTouches: "No touches for this day.",
  searchClients: "Search name or phone",
  emptyClients: "No clients yet.",
  statusLabel: {
    newbie: "New",
    regular: "Regular",
    candidate: "Candidate",
    partner: "Partner",
  },
  taskStatus: {
    pending: "Planned",
    done: "Done",
    overdue: "Overdue",
    skipped: "Skipped",
  },
} as typeof ru;

export type UiStrings = typeof ru;

export function strings(lang: AppLanguage = "ru"): UiStrings {
  return lang === "en" ? en : ru;
}