export type AppLanguage = "ru" | "en";

function formatDiagTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const copy = {
  ru: {
    welcome:
      "Sutra — CRM для сетевого бизнеса.\n\n" +
      "Тариф, Pro и настройки — кнопками в чате.\n" +
      "👇",
    menuHint: "👇",
    settingsTitle: "Настройки",
    syncTitle: "☁️ Синхронизация",
    btnCloudSignIn: "🔑 Войти в облако",
    btnCloudSignOut: "🚪 Выйти из облака",
    cloudSyncNow: "🔄 Синхронизировать",
    cloudNotLinked: "Облако не подключено.",
    cloudLinkedStatus: (email: string) => `Вошли в облако: ${email}`,
    cloudEmailPrompt: "Введите email для входа в облако одним сообщением в чат.",
    cloudCodePrompt: (email: string) => `Код отправлен на ${email}. Введите код из письма одним сообщением.`,
    cloudEmailInvalid: "Некорректный email. Попробуйте снова или нажмите «Назад».",
    cloudCodeInvalid: "Код слишком короткий.",
    cloudSignInOk: (email: string) => `Облако подключено: ${email}.`,
    cloudSignedOut: "Вы вышли из облака.",
    cloudSessionExpired: "Сессия облака истекла (перезапуск бота). Войдите снова.",
    cloudSyncChatOk: (clients: number) =>
      `Связь с облаком активна. Клиентов в облаке: ${clients}. Данные CRM синхронизируются при работе в Mini App.`,
    cloudSyncDiagnostics: (p: {
      maxUserId: number;
      supabaseUserId: string;
      localClients: number | null;
      localReportedAt: string | null;
      cloudClients: number;
    }) => {
      const localLine =
        p.localClients === null
          ? "Локальная база: нет отчёта — откройте CRM в Mini App на этом устройстве."
          : `Локальная база: ${p.localClients} клиент(ов) (Mini App: ${formatDiagTime(p.localReportedAt)})`;
      return (
        `Синхронизация (сводка)\n` +
        `MAX user id: ${p.maxUserId}\n` +
        `Supabase user id: ${p.supabaseUserId}\n` +
        `${localLine}\n` +
        `В облаке: ${p.cloudClients} клиент(ов)`
      );
    },
    cloudError: (err: unknown) => `Ошибка: ${err instanceof Error ? err.message : String(err)}`,
    languageTitle: "Язык",
    btnLanguage: "🌐 Язык",
    btnSync: "☁️ Синхронизация",
    btnBack: "◀️ Назад",
    btnSubscribePro: "Оформить Pro",
    syncProOnly: "Облако доступно на тарифе Pro. См. «💎 Pro».",
    langRu: "Русский",
    langEn: "Английский",
    menuRestored: "Главное меню",
    botTempError: "Не удалось показать меню. Попробуйте снова через минуту или напишите /start.",
    supabaseMissing: "Supabase не настроен на сервере (URL/ключ в .env).",
    btnSutra: "📋 Моя Sutra",
    btnTariff: "📊 Тариф",
    btnPro: "💎 Pro",
    btnSettings: "⚙️ Настройки",
    btnHelp: "❓ Помощь",
    tariffFree: (n: number) =>
      `Тариф: Free\nДо ${n} клиентов и до ${n} позиций в каждом справочнике (продукты, запросы).\nБез облачной синхронизации.`,
    tariffPro: "Тариф: Pro\nБез лимитов, синхронизация Supabase.",
    settings: "Настройки\nЯзык чата: русский.\nCRM — в Mini App «Моя Sutra».",
    proOfferLead: "Pro — без лимитов и с синхронизацией Supabase.",
    proOfferMonth: (rub: string, days: number) => `• Месяц: ${rub} ₽ (${days} дн.)`,
    proOfferYear: (rub: string, days: number) => `• Год: ${rub} ₽ (${days} дн.)`,
    proPayWeb: "Оплата — по кнопке «Оформить Pro» (страница ЮKassa).",
    proNotConfigured: "Pro\nОплата на сервере не настроена (YOOKASSA_* и PRO_*_RUB в .env).",
    proActive: (until: string) => `Pro активен до ${until}.\nСм. «📊 Тариф» и облако в Mini App.`,
    proPaidYookassa: (until: string) => `Оплата ЮKassa прошла. Pro активна до ${until}. См. «📊 Тариф».`,
    promoButton: "🎟 Промокод",
    promoStatusHint: "Промокод: «💎 Pro» → «🎟 Промокод».",
    promoPrompt: "Введите промокод одним сообщением в чат.",
    promoOk: (days: number, expires: string) => `Pro на ${days} дн. активирована до ${expires}. См. «📊 Тариф».`,
    promoUnknown: "Такого промокода нет или он не загружен на сервер (PROMO_CODES в .env).",
    promoUsed: "Вы уже активировали этот промокод.",
    promoExhausted: "Промокод исчерпан (лимит активаций).",
    promoInvalid: "Некорректный код.",
    promoAlreadyPro: "Pro уже активен. См. «📊 Тариф».",
    promoDbRequired: "Промокоды доступны только с Postgres (DATABASE_URL на сервере).",
    tariffProActive: (until: string) =>
      `Тариф: Pro\nАктивна до ${until}.\nОблако — иконка ☁️ внизу CRM (Mini App).`,
    help:
      "**Моя Sutra** — CRM в Mini App.\n" +
      "Кнопки **Тариф / Pro / Настройки / Помощь** — ответы в этом чате.\n" +
      "Облачная синхронизация (Pro) — вкладка ☁️ внизу Mini App.",
    unknown: "Выберите действие кнопками в меню ниже.",
    miniAppMissing:
      "Mini App не настроен: задайте PUBLIC_BASE_URL=https://… в .env и укажите URL в кабинете MAX.",
  },
  en: {
    welcome:
      "Sutra — network marketing CRM.\n\n" +
      "Plan, Pro, and settings — chat buttons.\n" +
      "👇",
    menuHint: "👇",
    settingsTitle: "Settings",
    syncTitle: "☁️ Sync",
    btnCloudSignIn: "🔑 Sign in to cloud",
    btnCloudSignOut: "🚪 Sign out of cloud",
    cloudSyncNow: "🔄 Sync now",
    cloudNotLinked: "Cloud is not linked.",
    cloudLinkedStatus: (email: string) => `Signed in: ${email}`,
    cloudEmailPrompt: "Send your cloud login email in one chat message.",
    cloudCodePrompt: (email: string) => `Code sent to ${email}. Send the code from the email in one message.`,
    cloudEmailInvalid: "Invalid email.",
    cloudCodeInvalid: "Code is too short.",
    cloudSignInOk: (email: string) => `Cloud linked: ${email}.`,
    cloudSignedOut: "Signed out of the cloud.",
    cloudSessionExpired: "Cloud session expired. Please sign in again.",
    cloudSyncChatOk: (clients: number) => `Cloud OK. Clients in cloud: ${clients}. CRM syncs in the Mini App.`,
    cloudSyncDiagnostics: (p: {
      maxUserId: number;
      supabaseUserId: string;
      localClients: number | null;
      localReportedAt: string | null;
      cloudClients: number;
    }) => {
      const localLine =
        p.localClients === null
          ? "Local DB: no report — open the CRM Mini App on this device."
          : `Local DB: ${p.localClients} client(s) (Mini App: ${formatDiagTime(p.localReportedAt)})`;
      return (
        `Sync summary\n` +
        `MAX user id: ${p.maxUserId}\n` +
        `Supabase user id: ${p.supabaseUserId}\n` +
        `${localLine}\n` +
        `In cloud: ${p.cloudClients} client(s)`
      );
    },
    cloudError: (err: unknown) => `Error: ${err instanceof Error ? err.message : String(err)}`,
    languageTitle: "Language",
    btnLanguage: "🌐 Language",
    btnSync: "☁️ Sync",
    btnBack: "◀️ Back",
    btnSubscribePro: "Get Pro",
    syncProOnly: "Cloud requires Pro. See «💎 Pro».",
    langRu: "Russian",
    langEn: "English",
    menuRestored: "Main menu",
    botTempError: "Could not show the menu. Try again in a minute or send /start.",
    supabaseMissing: "Supabase is not configured on the server.",
    btnSutra: "📋 My Sutra",
    btnTariff: "📊 Plan",
    btnPro: "💎 Pro",
    btnSettings: "⚙️ Settings",
    btnHelp: "❓ Help",
    tariffFree: (n: number) =>
      `Plan: Free\nUp to ${n} clients and ${n} items per catalog (products, client requests).\nNo cloud sync.`,
    tariffPro: "Plan: Pro\nNo limits; Supabase sync.",
    settings: "Settings\nChat language: English.\nCRM — My Sutra Mini App.",
    proOfferLead: "Pro — no limits and Supabase sync.",
    proOfferMonth: (rub: string, days: number) => `• Month: ${rub} ₽ (${days} days)`,
    proOfferYear: (rub: string, days: number) => `• Year: ${rub} ₽ (${days} days)`,
    proPayWeb: "Pay with «Get Pro» (YooKassa checkout).",
    proNotConfigured: "Pro\nBilling is not configured on the server.",
    proActive: (until: string) => `Pro is active until ${until}. See «📊 Plan» and cloud in the Mini App.`,
    proPaidYookassa: (until: string) => `YooKassa payment OK. Pro until ${until}. See «📊 Plan».`,
    promoButton: "🎟 Promo code",
    promoStatusHint: "Promo: «💎 Pro» → «🎟 Promo code».",
    promoPrompt: "Send your promo code in one chat message.",
    promoOk: (days: number, expires: string) => `Pro for ${days} days until ${expires}. See «📊 Plan».`,
    promoUnknown: "Unknown code or not loaded (PROMO_CODES in .env).",
    promoUsed: "You already redeemed this code.",
    promoExhausted: "This promo code has reached its activation limit.",
    promoInvalid: "Invalid code.",
    promoAlreadyPro: "Pro is already active.",
    promoDbRequired: "Promo codes require Postgres (DATABASE_URL on the server).",
    tariffProActive: (until: string) =>
      `Plan: Pro\nActive until ${until}.\nCloud — ☁️ tab at the bottom of the CRM Mini App.`,
    help:
      "**My Sutra** — CRM Mini App.\nPlan, Pro, Settings, Help — in this chat.\nCloud sync (Pro) — ☁️ tab at the bottom of the Mini App.",
    unknown: "Use the buttons below the input.",
    miniAppMissing: "Set PUBLIC_BASE_URL=https://… in .env and register in MAX.",
  },
} as const;

export function strings(lang: AppLanguage) {
  return copy[lang];
}

export const MENU_PAYLOADS = {
  today: "menu:today",
  tariff: "menu:tariff",
  pro: "menu:pro",
  settings: "menu:settings",
  help: "menu:help",
} as const;

const MENU_BUTTON_KEYS = ["btnTariff", "btnPro", "btnSettings"] as const;

export function allMenuLabels(): Set<string> {
  const out = new Set<string>();
  for (const lang of ["ru", "en"] as const) {
    const t = strings(lang);
    for (const key of MENU_BUTTON_KEYS) {
      out.add(t[key]);
    }
  }
  return out;
}

function normalizeMenuLabel(text: string): string {
  return text.trim().replace(/\uFE0F/g, "");
}

export function actionForMenuText(text: string): keyof typeof MENU_PAYLOADS | null {
  const trimmed = normalizeMenuLabel(text);
  for (const lang of ["ru", "en"] as const) {
    const t = strings(lang);
    if (trimmed === normalizeMenuLabel(t.btnTariff)) return "tariff";
    if (trimmed === normalizeMenuLabel(t.btnPro)) return "pro";
    if (trimmed === normalizeMenuLabel(t.btnSettings)) return "settings";
    if (trimmed === t.btnHelp) return "help";
    if (trimmed === t.btnSutra) return "today";
  }
  return null;
}