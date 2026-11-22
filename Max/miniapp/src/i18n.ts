import { DomainError, type DomainErrorCode } from "./domain/validate.js";

export type AppLanguage = "ru" | "en";

export type TaskTypeKey =
  | "service_usage"
  | "control_checkin"
  | "result_checkpoint"
  | "cross_sell"
  | "reorder_reminder"
  | "partnership_offer";

type ErrorMessages = Record<
  DomainErrorCode,
  string | ((n: number) => string)
>;

function buildCatalog(lang: AppLanguage) {
  const isEn = lang === "en";

  const errors: ErrorMessages = isEn
    ? {
        client_name_required: "Enter the client's name.",
        client_name_too_long: "Name is too long (max 120 characters).",
        phone_too_long: "Phone number is too long.",
        additional_info_too_long: "Additional information is too long.",
        status_unknown: "Unknown status.",
        product_name_required: "Enter a product name.",
        product_name_too_long: "Product name is too long.",
        request_name_required: "Enter a client request name.",
        request_name_too_long: "Name is too long.",
        duration_range: "Course length must be between 1 and 3650 days.",
        date_format: "Date must be YYYY-MM-DD.",
        date_invalid: "Invalid calendar date.",
        date_offset_integer: "Day offset must be a whole number.",
        free_limit_clients: (n) => `Free plan: up to ${n} clients. Get Pro in the bot chat.`,
        free_limit_products: (n) => `Free plan: up to ${n} products. Get Pro in the bot chat.`,
        free_limit_requests: (n) => `Free plan: up to ${n} client requests. Get Pro in the bot chat.`,
        client_request_not_found: "Client request not found.",
        client_not_found: "Client not found.",
        product_not_found: "Product not found.",
        product_in_use: "Cannot delete: purchases use this product.",
        request_in_use: "Cannot delete: clients use this request.",
      }
    : {
        client_name_required: "Укажите имя клиента.",
        client_name_too_long: "Имя слишком длинное.",
        phone_too_long: "Телефон слишком длинный.",
        additional_info_too_long: "Дополнительная информация слишком длинная.",
        status_unknown: "Неизвестный статус.",
        product_name_required: "Укажите название продукта.",
        product_name_too_long: "Название слишком длинное.",
        request_name_required: "Укажите название запроса.",
        request_name_too_long: "Слишком длинное название.",
        duration_range: "Срок курса: от 1 до 3650 дней.",
        date_format: "Дата должна быть в формате ГГГГ-ММ-ДД.",
        date_invalid: "Такой календарной даты нет.",
        date_offset_integer: "Сдвиг даты должен быть целым числом дней.",
        free_limit_clients: (n: number) => `Лимит Free: не больше ${n} клиентов. Оформите Pro в чате с ботом.`,
        free_limit_products: (n: number) => `Лимит Free: не больше ${n} продуктов. Оформите Pro в чате с ботом.`,
        free_limit_requests: (n: number) => `Лимит Free: не больше ${n} запросов клиента. Оформите Pro в чате с ботом.`,
        client_request_not_found: "Запрос клиента не найден.",
        client_not_found: "Клиент не найден.",
        product_not_found: "Продукт не найден.",
        product_in_use: "Нельзя удалить: есть покупки с этим продуктом.",
        request_in_use: "Нельзя удалить: запрос выбран у клиентов.",
      };

  const taskTitles: Record<TaskTypeKey, string> = isEn
    ? {
        service_usage: "Service: Explain product use and storage",
        control_checkin: "Check-in: Ask how the product is working",
        result_checkpoint: "Results: Ask for feedback on the effect",
        cross_sell: "Cross-sell: Offer another catalog product",
        reorder_reminder: "Reorder reminder: product running out soon",
        partnership_offer: "Partnership window: Make a business offer",
      }
    : {
        service_usage: "Сервис: Объяснить, как пользоваться продуктом и как его хранить",
        control_checkin: "Контроль: Уточнить впечатление от продукта и ответить на вопросы",
        result_checkpoint: "Результат: Спросить об эффекте или обратной связи",
        cross_sell: "Кросс-селл: Предложить дополнительный продукт из вашего каталога",
        reorder_reminder: "Напомнить о заказе, продукт скоро закончится",
        partnership_offer: "Окно партнерства: Сделать бизнес-предложение",
      };

  const taskDetailFns = {
    cross_sell: (productName: string) =>
      isEn
        ? `After «${productName}». Ask what else might help and offer another catalog product — not a repeat of this purchase.`
        : `После «${productName}». Уточнить, что ещё может пригодиться, и предложить другой продукт из каталога — не повтор текущей покупки.`,
    service_usage: (productName: string) =>
      isEn
        ? `Product «${productName}». Explain how to use and store it.`
        : `Продукт «${productName}». Показать, как пользоваться и как хранить.`,
    control_checkin: (productName: string) =>
      isEn
        ? `Product «${productName}». Ask if everything is clear and if they are happy so far.`
        : `Продукт «${productName}». Спросить, всё ли понятно и устраивает ли результат на этом этапе.`,
    result_default: (productName: string) =>
      isEn
        ? `Product «${productName}». Capture the client's feedback in their own words.`
        : `Продукт «${productName}». Зафиксировать обратную связь словами клиента.`,
    reorder: (productName: string, durationDays: number, endsOn: string) =>
      isEn
        ? `«${productName}»: ${durationDays} days, estimated end ${endsOn}.`
        : `«${productName}»: период ${durationDays} дн., расчетное окончание ${endsOn}.`,
    partnership: (changedOn: string) =>
      isEn
        ? `«Regular client» set on ${changedOn}. Task is scheduled 21 days later when moving to this status.`
        : `Статус «Постоянный клиент» установлен ${changedOn}. Задача ставится через 21 день и только при переводе в этот статус.`,
  };

  return {
    appTitle: "Sutra",
    today: isEn ? "Today" : "Сегодня",
    clients: isEn ? "Clients" : "Клиенты",
    directories: isEn ? "Directories" : "Справочники",
    dirProducts: isEn ? "Products" : "Продукты",
    dirClientRequests: isEn ? "Client requests" : "Запросы клиентов",
    tier: (t: string) => (isEn ? `Plan: ${t.toUpperCase()}` : `Тариф: ${t.toUpperCase()}`),
    noTouches: isEn ? "No touches for this day." : "На этот день касаний нет.",
    overdue: (n: number) => (isEn ? `Overdue (${n})` : `Просрочено (${n})`),
    clientsCount: (n: number, limit: number | null) =>
      limit != null
        ? isEn
          ? `Clients: ${n} / limit ${limit}`
          : `Клиентов: ${n} / лимит ${limit}`
        : isEn
          ? `Clients: ${n}`
          : `Клиентов: ${n}`,
    searchClients: isEn ? "Search by name or phone" : "Поиск по имени или телефону",
    emptyClients: isEn ? "No clients yet." : "Пока нет клиентов.",
    noSearchHits: isEn ? "Nothing found." : "Ничего не найдено.",
    category: {
      service: isEn ? "Service" : "Сервис",
      upsell: isEn ? "Upsell" : "Допродажа",
      partnership: isEn ? "Partnership" : "Партнёрство",
    } as Record<string, string>,
    statusLabel: isEn
      ? { newbie: "New", regular: "Regular", candidate: "Candidate", partner: "Partner" }
      : { newbie: "Новичок", regular: "Постоянный", candidate: "Кандидат", partner: "Партнёр" },
    taskStatus: isEn
      ? { pending: "Planned", done: "Done", overdue: "Overdue", skipped: "Skipped" }
      : { pending: "В плане", done: "Готово", overdue: "Просрочено", skipped: "Пропущено" },
    taskTitles,
    taskDetailFns,
    complete: isEn ? "Done" : "Готово",
    newClient: isEn ? "New client" : "Новый клиент",
    name: isEn ? "Name" : "Имя",
    phone: isEn ? "Phone" : "Телефон",
    call: isEn ? "Call" : "Позвонить",
    funnel: isEn ? "Funnel" : "Воронка",
    funnelHint: isEn
      ? "«Regular» status schedules a partnership touch in 21 days."
      : "Статус «Постоянный» ставит касание партнёрства через 21 день.",
    partnershipLater: isEn
      ? "A partnership touch appears when you move the client to «Regular»."
      : "Партнёрское касание появится, если переведёте клиента в «Постоянный».",
    save: isEn ? "Save" : "Сохранить",
    create: isEn ? "Create" : "Создать",
    createClient: isEn ? "Create client" : "Создать клиента",
    saveProfile: isEn ? "Save" : "Сохранить",
    profileSaved: isEn ? "Profile saved" : "Профиль сохранён",
    saving: isEn ? "Saving…" : "Сохранение…",
    partnershipScheduled: (d: string) =>
      isEn ? `Partnership touch scheduled for ${d}.` : `Запланировано партнёрское касание на ${d}.`,
    statusFailed: isEn ? "Could not change status" : "Не удалось сменить статус",
    saveFailed: isEn ? "Could not save" : "Не удалось сохранить",
    clientRequestLabel: isEn ? "Client request" : "Запрос клиента",
    chooseClientRequest: isEn ? "Choose a request" : "Выберите запрос",
    clearSelection: isEn ? "Clear" : "Сбросить",
    additionalInfo: isEn ? "Additional info" : "Доп. информация",
    purchases: isEn ? "Purchases" : "Покупки",
    recordPurchase: isEn ? "Record purchase" : "Покупка",
    noPurchases: isEn ? "No purchases yet." : "Покупок пока нет.",
    deletePurchase: isEn ? "Delete purchase" : "Удалить покупку",
    deletePurchaseConfirm: (name: string) => (isEn ? `Delete purchase «${name}»?` : `Удалить покупку «${name}»?`),
    purchasedOn: (bought: string, ends: string) =>
      isEn ? `Bought ${bought}, course ends ${ends}` : `Куплено ${bought}, окончание курса ${ends}`,
    timeline: isEn ? "Touches" : "Касания",
    emptyTimeline: isEn ? "No touches yet." : "Касаний пока нет.",
    newPurchase: isEn ? "New purchase" : "Новая покупка",
    productLabel: isEn ? "Product" : "Продукт",
    chooseProduct: isEn ? "Choose a product" : "Выберите продукт",
    purchaseDate: isEn ? "Purchase date" : "Дата покупки",
    willCreate: isEn ? "Touches to be created" : "Будет создано касаний",
    recordPurchaseAction: isEn ? "Record" : "Зафиксировать",
    touchesCreated: isEn ? "Touches created" : "Касания созданы",
    touchesCreatedLead: (n: number) =>
      isEn ? `${n} touch(es) added from the purchase plan.` : `Создано ${n} касаний по плану после покупки.`,
    done: isEn ? "Done" : "Готово",
    durationDays: (d: number) => (isEn ? `${d} d` : `${d} дн.`),
    courseDurationLabel: isEn ? "Course length (days)" : "Срок курса (дней)",
    pickerHint: isEn ? "Tap the row again to select" : "Нажмите ещё раз на строку, чтобы выбрать",
    add: isEn ? "Add" : "Добавить",
    edit: isEn ? "Edit" : "Изменить",
    delete: isEn ? "Delete" : "Удалить",
    back: isEn ? "Back" : "Назад",
    cancel: isEn ? "Cancel" : "Отмена",
    ok: isEn ? "OK" : "ОК",
    confirmTitle: isEn ? "Confirm" : "Подтверждение",
    deleteNamed: (name: string) => (isEn ? `Delete «${name}»?` : `Удалить «${name}»?`),
    deleteClientNamed: (name: string) => (isEn ? `Delete ${name}?` : `Удалить ${name}?`),
    productNew: isEn ? "New product" : "Новый продукт",
    productEdit: isEn ? "Edit product" : "Редактирование",
    requestNew: isEn ? "New request" : "Новый запрос",
    requestEdit: isEn ? "Edit request" : "Редактирование",
    catalogEntryNew: isEn ? "New entry" : "Новая запись",
    catalogEntryEdit: isEn ? "Edit entry" : "Редактирование",
    titleLabel: isEn ? "Title" : "Название",
    productNamePlaceholder: isEn ? "Product name" : "Название продукта",
    requestNamePlaceholder: isEn ? "Request name" : "Название запроса",
    titlePlaceholder: isEn ? "Title" : "Название",
    namePlaceholder: isEn ? "Anna" : "Анна",
    notesPlaceholder: isEn ? "Notes" : "Заметки",
    noProducts: isEn ? "No products." : "Нет продуктов.",
    noRequests: isEn ? "No client requests." : "Нет запросов клиентов.",
    catalogEmpty: isEn ? "List is empty. Add an entry." : "Список пуст. Добавьте запись.",
    productDurationLine: (d: number) => (isEn ? `Duration: ${d} d` : `Срок: ${d} дн.`),
    backToDirectories: isEn ? "← Directories" : "← Справочники",
    backToProducts: isEn ? "← Products" : "← Продукты",
    backToRequests: isEn ? "← Requests" : "← Запросы",
    entryNotFound: isEn ? "Entry not found" : "Запись не найдена",
    clientNotFound: isEn ? "Client not found" : "Клиент не найден",
    checkDate: isEn ? "Check the date" : "Проверьте дату",
    prevDay: isEn ? "Previous day" : "Предыдущий день",
    nextDay: isEn ? "Next day" : "Следующий день",
    deleteFallbackProduct: isEn ? "product" : "продукт",
    deleteFallbackRequest: isEn ? "request" : "запрос",
    deleteFallbackClient: isEn ? "client" : "клиента",
    deleteFallbackEntry: isEn ? "entry" : "запись",
    cloudTitle: isEn ? "Sutra Cloud" : "Облако Sutra",
    cloudClose: isEn ? "Close" : "Закрыть",
    cloudBrowserHint: isEn
      ? "Open the CRM from the bot in MAX (Mini App) for full access."
      : "Для полного доступа откройте CRM через бота в MAX (Mini App).",
    cloudProOnly: isEn ? "Supabase sync is available on the Pro plan." : "Синхронизация Supabase доступна на тарифе Pro.",
    cloudNotConfigured: isEn ? "SUPABASE URL/key not set on the server." : "На сервере не заданы SUPABASE URL/ключ.",
    cloudSignInHint: isEn
      ? "Sign in with email — a code will be sent (same as the mobile app)."
      : "Войдите по email — код придёт на почту (как в мобильном приложении).",
    cloudEmail: "Email",
    cloudCode: isEn ? "Code from email" : "Код из письма",
    cloudSendCode: isEn ? "Send code to email" : "Отправить код на почту",
    cloudVerify: isEn ? "Sign in to cloud" : "Войти в облако",
    cloudSignedIn: (email: string) => (isEn ? `Signed in: ${email}` : `Вошли: ${email}`),
    cloudSyncHint: isEn
      ? "After sign-in, changes sync automatically. Tap Sync to force a run."
      : "После входа данные синхронизируются сами при изменениях. «Синхронизировать» — принудительный прогон.",
    cloudSyncNow: isEn ? "Sync" : "Синхронизировать",
    cloudSyncing: isEn ? "Syncing…" : "Синхронизация…",
    cloudSyncOk: (r: { clients: number; pushed: number; pulled: number }) => {
      if (r.pushed > 0 || r.pulled > 0) {
        return isEn
          ? `Done: sent ${r.pushed}, applied from cloud ${r.pulled}. Clients: ${r.clients}.`
          : `Готово: отправлено ${r.pushed}, применено из облака ${r.pulled}. Клиентов: ${r.clients}.`;
      }
      return isEn ? `Data is up to date. Clients: ${r.clients}.` : `Данные актуальны. Клиентов: ${r.clients}.`;
    },
    cloudSignOut: isEn ? "Sign out of cloud" : "Выйти из облака",
    cloudSignedOut: isEn ? "Signed out of cloud." : "Вы вышли из облака.",
    cloudEmailRequired: isEn ? "Enter email." : "Укажите email.",
    cloudCodeRequired: isEn ? "Enter email and code." : "Укажите email и код.",
    cloudCodeSent: (email: string) => (isEn ? `Code sent to ${email}.` : `Код отправлен на ${email}.`),
    cloudNoSession: isEn ? "Supabase session not found. Sign in again." : "Сессия Supabase не найдена. Войдите снова.",
    cloudError: (err: unknown) =>
      isEn ? `Error: ${err instanceof Error ? err.message : String(err)}` : `Ошибка: ${err instanceof Error ? err.message : String(err)}`,
    loading: isEn ? "Loading…" : "Загрузка…",
    openFromMax: isEn ? "Open the app from the MAX bot chat" : "Откройте приложение из чата с ботом MAX",
    profileFailed: isEn ? "Could not load profile" : "Не удалось получить профиль",
    navSections: isEn ? "CRM sections" : "Разделы CRM",
    tabCloud: isEn ? "Cloud" : "Облако",
    errors,
  };
}

const ru = buildCatalog("ru");
const en = buildCatalog("en");

export type UiStrings = typeof ru;

export function strings(lang: AppLanguage = "ru"): UiStrings {
  return lang === "en" ? en : ru;
}

export function formatDomainError(e: DomainError, t: UiStrings): string {
  const v = t.errors[e.code];
  if (typeof v === "function") return v(e.param ?? 0);
  return v;
}

export function userErrorMessage(e: unknown, t: UiStrings, fallback?: string): string {
  if (e instanceof DomainError) return formatDomainError(e, t);
  if (fallback) return fallback;
  return t.cloudError(e);
}

/** Prefer localized task title by type; fall back to stored text (e.g. legacy rows). */
export function taskDisplayTitle(t: UiStrings, type: string, stored: string): string {
  const key = type as TaskTypeKey;
  return t.taskTitles[key] ?? stored;
}