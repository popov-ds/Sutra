# Деплой SutraMaxBot на AdminVPS

Цель: **`/opt/SutraMaxBot`**, рядом **`/opt/solver`** и **`/opt/YogaShedulerTelegramBot`** — **не меняем**.

| Сервис | Порт на loopback |
|--------|------------------|
| solver | `8080` (как было) |
| YogaSheduler | `18080` |
| **Sutra MAX** | **`18081`** |

Docker project: `sutramaxbot` (тома `sutramax_data`, **`sutramax_pgdata`** — Postgres **`sutra_max_bot`** на `127.0.0.1:55433`).

| Yoga | Sutra MAX |
|------|-----------|
| `55432` / `yogascheduler_bot` | **`55433` / `sutra_max_bot`** |

## 1. Локально

```powershell
cd D:\Partners\Projects\Sutra\Max
copy .env.example .env
# MAX_BOT_TOKEN, LAUNCH_TOKEN_SECRET, Supabase (для Pro)
npm install
npm run build
```

## 2. Загрузка на сервер

**Обычные обновления (как Yoga `upload.py`):**

```powershell
cd D:\Partners\Projects\Sutra\Max
$env:SSH_PASS = "..."
python upload.py
```

Не перезаписывает `/opt/SutraMaxBot/.env` и volume `sutramax_data`. Сборка — в Docker на VPS.

**Первый деплой / полный bundle — Python (без rsync):**

```powershell
$env:SUTRAMAX_SSH_PASS = "..."
python deploy\vps\remote_deploy.py
python deploy\vps\setup_sutra_subdomain.py   # DNS A → IP, CERTBOT_EMAIL=...
```

**Вариант B — rsync:**

```powershell
$env:SUTRAMAX_SSH = "root@168.113.171.219"
.\deploy\vps\sync-from-windows.ps1
```

На VPS:

```bash
cd /opt/SutraMaxBot
nano .env
bash deploy/vps/install-on-server.sh
curl -sS http://127.0.0.1:18081/health
```

## 3. HTTPS

DNS (reg.ru, зона **`dreamer-soft.pro`**): **A** `sutra.max` → `168.113.171.219` (или свой поддомен → `SUTRAMAX_DOMAIN`).

```env
PUBLIC_BASE_URL=https://sutra.max.dreamer-soft.pro
```

Nginx: `deploy/vps/nginx-sutra.max.dreamer-soft.conf.example` — **отдельный** `server_name` (не vhost solver).

HTTPS с Windows:

```powershell
cd D:\Partners\Projects\Sutra\Max
$env:SUTRAMAX_SSH_PASS = "..."
python deploy\vps\setup_sutra_subdomain.py
```

### Чеклист DNS в reg.ru (`sutra.max.dreamer-soft.pro`)

Перед certbot и проверкой Mini App с телефона **без VPN**.

#### reg.ru — зона `dreamer-soft.pro`

- [ ] **Делегирование:** у домена NS → `ns1.reg.ru` / `ns2.reg.ru` (записи правим в reg.ru, не дублируем A в AdminVPS, если NS не на хостере).
- [ ] **Запись:** тип **A**, имя/хост **`sutra.max`** (не `sutra.max.dreamer-soft.pro` целиком, если панель сама дописывает зону).
- [ ] **Значение:** публичный IP VPS, сейчас **`168.113.171.219`** (`dig +short sutra.max.dreamer-soft.pro @ns1.reg.ru`).
- [ ] **Лишнего нет:** нет **CNAME** на тот же хост, нет второй A с другим IP, нет старого **AAAA** (если IPv6 не используете).
- [ ] **TTL:** на время раската **300–600** с; после стабилизации можно **3600+**.
- [ ] **Сохранить** запись в панели и подождать TTL (или до 30 мин при коротком TTL).

#### Проверка с ПК (PowerShell / терминал)

- [ ] `nslookup sutra.max.dreamer-soft.pro 8.8.8.8` → тот же IP.
- [ ] `nslookup sutra.max.dreamer-soft.pro 77.88.8.8` → тот же IP.
- [ ] `nslookup sutra.max.dreamer-soft.pro 195.208.4.1` → тот же IP (reg.ru / многие RU-сети).
- [ ] `curl.exe -sS https://sutra.max.dreamer-soft.pro/health` → **`ok`**.

#### Проверка на телефоне (LTE/Wi‑Fi **без VPN**)

- [ ] Chrome: `https://sutra.max.dreamer-soft.pro/health` → `ok`, без «небезопасное соединение».
- [ ] Сравнение: `https://support.dreamer-soft.pro/health` открывается так же (если support жив — проблема узкая по `sutra.max`, иначе общая по зоне).

Если **без VPN** `sutra` не открывается, а **с VPN** — да: чаще **кэш DNS оператора** по новому имени; приватный DNS (`dns.google` / `one.one.one.one`) или дождаться TTL.

#### VPS и приложение

- [ ] `/opt/SutraMaxBot/.env`: `PUBLIC_BASE_URL=https://sutra.max.dreamer-soft.pro` (без слэша на конце).
- [ ] Nginx: `server_name sutra.max.dreamer-soft.pro`, сертификат Let's Encrypt на **это** имя (`certbot certificates`).
- [ ] В кабинете **MAX**: URL Mini App = `https://sutra.max.dreamer-soft.pro/miniapp/` (не `master-solver.ru`).
- [ ] После смены DNS/URL: пересборка/рестарт бота при необходимости; полностью закрыть MAX на телефоне и открыть снова.

#### Опционально (старый Android / предупреждения TLS)

- [ ] На VPS: `python deploy/vps/_fix_tls_chain.py` (цепочка **ISRG Root X1**), когда Let's Encrypt стабильно видит A-запись с внешних DNS.

## Утренний дайджест касаний (чат MAX)

Pro-пользователи с привязанным облаком (вход в Supabase в Mini App) получают в **9:00** сообщение с планом касаний на день. Данные читаются из **Supabase** (`SUPABASE_SERVICE_ROLE_KEY` в `.env` на VPS, **не** в Mini App). После деплоя: Pro → облако в Mini App → синхронизация CRM.

## 4. MAX

- Mini App: `PUBLIC_BASE_URL/miniapp/`
- Webhook (если отключите polling): `MAX_USE_POLLING=0`, `POST …/webhooks/max`, заголовок `X-Max-Bot-Api-Secret`

## 5. ЮKassa

В `.env` на VPS: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `PRO_MONTH_RUB`, `PRO_YEAR_RUB` (формат `299.00`).

- Уведомления бота: `https://sutra.max.dreamer-soft.pro/webhooks/yookassa` (проксируется тем же `location /`, что Mini App)
- **Один shopId с Yoga:** `https://payment.dreamer-soft.pro/webhooks/yookassa` (hub: `DreamerSoft/YookassaPaymentHub`).
- Return URL создаётся API: `/pay/return`
- После деплоя: в боте «💎 Pro» → «Оформить Pro» → тестовый платёж → «📊 Тариф» должен показать Pro

## Проверка изоляции

```bash
ss -tlnp | grep -E ':8080|:18080|:18081'
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```