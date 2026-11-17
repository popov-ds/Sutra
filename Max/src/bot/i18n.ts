export type AppLanguage = "ru" | "en";

const copy = {
  ru: {
    welcome:
      "Sutra — CRM для сетевого бизнеса.\n\n" +
      "Работа с клиентами — **Моя Sutra** (Mini App).\n" +
      "Тариф, Pro и настройки — кнопками в чате.",
    menuHint: "👇",
    settingsTitle: "Настройки",
    languageTitle: "Язык",
    btnLanguage: "Язык",
    btnSubscription: "Подписка",
    btnBack: "Назад",
    btnSubscribePro: "Оформить Pro",
    btnCloudAccount: "Аккаунт облака",
    btnCloudDisconnect: "Отключить синхронизацию",
    langRu: "Русский",
    langEn: "Английский",
    menuRestored: "Главное меню",
    cloudNotLinked: "Синхронизация Supabase не подключена. Войдите по email.",
    cloudLinkedHint: "Облако подключено. В Mini App данные можно синхронизировать.",
    askCloudEmail: "Введите email для Supabase (одним сообщением в чат):",
    invalidEmail: "Некорректный email.",
    supabaseMissing: "Supabase не настроен на сервере (URL/ключ в .env).",
    otpSendFailed: "Не удалось отправить код:",
    otpSent: (email: string) => `Код отправлен на ${email}. Введите его в чат.`,
    otpInvalid: "Неверный код. Попробуйте снова.",
    btnSutra: "📋 Моя Sutra",
    btnTariff: "📊 Тариф",
    btnPro: "💎 Pro",
    btnSettings: "⚙️ Настройки",
    btnHelp: "❓ Помощь",
    tariffFree: (n: number) => `Тариф: Free\nДо ${n} клиентов и записей в справочниках.\nБез облачной синхронизации.`,
    tariffPro: "Тариф: Pro\nБез лимитов, синхронизация Supabase.",
    settings: "Настройки\nЯзык чата: русский.\nCRM — в Mini App «Моя Sutra».",
    pro: "Pro\nОформление подписки подключается на сервере.\nПока — тестовый Pro через администратора.",
    help:
      "**Моя Sutra** — CRM в Mini App.\n" +
      "Кнопки **Тариф / Pro / Настройки / Помощь** — ответы в этом чате.\n" +
      "Данные CRM — локально в браузере; Pro — sync с Supabase.",
    unknown: "Выберите действие кнопками в меню ниже.",
    miniAppMissing:
      "Mini App не настроен: задайте PUBLIC_BASE_URL=https://… в .env и укажите URL в кабинете MAX.",
  },
  en: {
    welcome:
      "Sutra — network marketing CRM.\n\n" +
      "CRM — **My Sutra** Mini App.\n" +
      "Plan, Pro, settings — chat buttons.",
    menuHint: "👇",
    settingsTitle: "Settings",
    languageTitle: "Language",
    btnLanguage: "Language",
    btnSubscription: "Subscription",
    btnBack: "Back",
    btnSubscribePro: "Get Pro",
    btnCloudAccount: "Cloud account",
    btnCloudDisconnect: "Disconnect sync",
    langRu: "Russian",
    langEn: "English",
    menuRestored: "Main menu",
    cloudNotLinked: "Supabase sync is not linked. Sign in with email.",
    cloudLinkedHint: "Cloud linked. Sync data in the Mini App.",
    askCloudEmail: "Enter your Supabase email in chat:",
    invalidEmail: "Invalid email.",
    supabaseMissing: "Supabase is not configured on the server.",
    otpSendFailed: "Could not send code:",
    otpSent: (email: string) => `Code sent to ${email}. Enter it in chat.`,
    otpInvalid: "Invalid code. Try again.",
    btnSutra: "📋 My Sutra",
    btnTariff: "📊 Plan",
    btnPro: "💎 Pro",
    btnSettings: "⚙️ Settings",
    btnHelp: "❓ Help",
    tariffFree: (n: number) => `Plan: Free\nUp to ${n} clients and catalog entries.\nNo cloud sync.`,
    tariffPro: "Plan: Pro\nNo limits; Supabase sync.",
    settings: "Settings\nChat language: English.\nCRM — My Sutra Mini App.",
    pro: "Pro\nBilling on the server.\nTest Pro via admin for now.",
    help: "**My Sutra** — CRM Mini App.\nOther buttons — answers in chat.\nLocal data in browser; Pro — Supabase.",
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

export function actionForMenuText(text: string): keyof typeof MENU_PAYLOADS | null {
  const trimmed = text.trim();
  for (const lang of ["ru", "en"] as const) {
    const t = strings(lang);
    if (trimmed === t.btnTariff) return "tariff";
    if (trimmed === t.btnPro) return "pro";
    if (trimmed === t.btnSettings) return "settings";
    if (trimmed === t.btnHelp) return "help";
    if (trimmed === t.btnSutra) return "today";
  }
  return null;
}