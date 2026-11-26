# Sutra — бот MAX

CRM **Sutra** в мессенджере MAX:

| Зона | Что делает |
|------|------------|
| **Mini App** | Клиенты, задачи на сегодня, покупки — вся рабочая логика |
| **Чат + меню** | Старт, тариф, Pro, настройки языка, помощь |
| **Сервер бота** | Webhook/long poll, Mini App, **Postgres `sutra_max_bot`**: профиль, подписки, промокоды (как Yoga) |

## Локальные данные и Pro

- База CRM хранится **в браузере пользователя** (IndexedDB + **sql.js**, схема как в мобильном Sutra).
- На сервере **нет** таблиц clients / tasks / purchases.
- **Pro**: Mini App входит в Supabase (email OTP, как в приложении) и синхронизирует локальную БД с облаком (`user_id` = auth.users).

Документация MAX: [API](https://dev.max.ru/docs-api), [Mini App](https://dev.max.ru/docs/webapps/introduction), [Bridge](https://dev.max.ru/docs/webapps/bridge).

## Быстрый старт

```powershell
cd D:\Partners\Projects\Sutra\Max
copy .env.example .env
# Заполните MAX_BOT_TOKEN, PUBLIC_BASE_URL (https), LAUNCH_TOKEN_SECRET, Supabase
npm install
npm run build
npm start
```

Для разработки Mini App: `npm run dev:miniapp` + туннель (Cloudflare/ngrok) на `HTTP_PORT`.

В кабинете MAX: URL Mini App = `PUBLIC_BASE_URL/miniapp/`, webhook = `POST …/webhooks/max`.

## VPS

Каталог **`/opt/SutraMaxBot`**, порт **`127.0.0.1:18081`**, поддомен по умолчанию `sutra.max.dreamer-soft.pro`. Подробно: [docs/deploy-adminvps.md](docs/deploy-adminvps.md).

## Структура

```
src/bot/        — обработка Update, фиксированное меню, billing/settings
src/max/        — HTTP-клиент MAX API
src/db/         — только bot_users.json (maxUserId, tier, lang)
src/http/       — webhook, статика, /api/me
miniapp/        — SPA: локальная SQLite + sync Supabase
```

**ЮKassa (Pro):** `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `PRO_MONTH_RUB`, `PRO_YEAR_RUB`; webhook `POST …/webhooks/yookassa`; оплата из чата — кнопка в «💎 Pro», страницы `/pay/start`, `/pay/return`.

Дальнейшие шаги: initData MAX для подписи launch (когда подключите валидацию из Bridge).

## Restart бота на VPS

cd /opt/SutraMaxBot
docker compose -f docker-compose.vps.yml restart bot