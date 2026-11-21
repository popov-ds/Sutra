# Деплой SutraMaxBot на AdminVPS

Цель: **`/opt/SutraMaxBot`**, рядом **`/opt/solver`** и **`/opt/YogaShedulerTelegramBot`** — **не меняем**.

| Сервис | Порт на loopback |
|--------|------------------|
| solver | `8080` (как было) |
| YogaSheduler | `18080` |
| **Sutra MAX** | **`18081`** |

Docker project: `sutramaxbot` (тома `sutramax_data`, **`sutramax_pgdata`** — Postgres **`sutra_bot`** на `127.0.0.1:55433`).

| Yoga | Sutra MAX |
|------|-----------|
| `55432` / `yogascheduler_bot` | **`55433` / `sutra_bot`** |

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

DNS: **`sutra.max.master-solver.ru`** → `168.113.171.219` (или свой поддомен → `SUTRAMAX_DOMAIN`).

```env
PUBLIC_BASE_URL=https://sutra.max.master-solver.ru
```

Nginx: `deploy/vps/nginx-sutra.max.master-solver.conf.example` — **отдельный** `server_name`, не `master-solver.ru`.

## 4. MAX

- Mini App: `PUBLIC_BASE_URL/miniapp/`
- Webhook (если отключите polling): `MAX_USE_POLLING=0`, `POST …/webhooks/max`, заголовок `X-Max-Bot-Api-Secret`

## 5. ЮKassa

В `.env` на VPS: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `PRO_MONTH_RUB`, `PRO_YEAR_RUB` (формат `299.00`).

- Уведомления: `https://sutra.max.master-solver.ru/webhooks/yookassa` (проксируется тем же `location /`, что Mini App)
- Return URL создаётся API: `/pay/return`
- После деплоя: в боте «💎 Pro» → «Оформить Pro» → тестовый платёж → «📊 Тариф» должен показать Pro

## Проверка изоляции

```bash
ss -tlnp | grep -E ':8080|:18080|:18081'
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```