# Supabase

1. В [Dashboard](https://supabase.com/dashboard/project/obtyfcqswxlyjhbmgkiy/sql/new) → **SQL** выполните по шагам (или один файл `schema.sql`):

   | Шаг | Файл |
   |-----|------|
   | 1 | `supabase/steps/01_tables.sql` |
   | 2 | `supabase/steps/02_indexes.sql` |
   | 3 | `supabase/steps/03_enable_rls.sql` |
   | 4 | `supabase/steps/04_policies.sql` |

   После каждого шага — **Run**. Проверка: `npm run verify:supabase`
2. **Почта для входа (OTP-код, не ссылка)**

   Приложение ждёт **6-значный код** в настройках. В письме должен быть `{{ .Token }}`, не magic link.

   Пока **не включён Custom SMTP**, Dashboard не сохраняет свои Subject/Body (*Set up custom SMTP to edit their subject and body*). Встроенная почта Supabase — для тестов (~2 письма/час, часто только email участников команды проекта).

   **2a. Custom SMTP** (Resend, SendGrid, Brevo, корпоративный SMTP — что удобнее):

   | Поле в Supabase | Пример (Resend) |
   |-----------------|-----------------|
   | Host | `smtp.resend.com` |
   | Port | `465` или `587` — по доке провайдера |
   | User | `resend` |
   | Password | API-ключ провайдера (только в Dashboard Supabase, не в git) |
   | Sender email | с верифицированного домена, напр. `no-reply@example.com` |
   | Sender name | `Sutra` |

   **Authentication → Emails → SMTP Settings** → Enable custom SMTP → **Save**.

   Затем при необходимости **Authentication → Rate Limits** (лимит писем после первого SMTP).

   **2b. Authentication → Providers** → **Email** включён.

   **2c. Шаблон OTP** — **Authentication → Emails → Templates → Magic link** (тот же тип, что `signInWithOtp`):

   - Subject: `Код для входа в Sutra`
   - Body: [`email-magic-link-otp.html`](./email-magic-link-otp.html)
   - **Save**

   Если в письме по-прежнему ссылка — шаблон не сохранился (нет SMTP) или не тот template.

   Документация: [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless#with-otp).

3. URL и anon (publishable) key — в `.env` как `EXPO_PUBLIC_SUPABASE_URL` и `EXPO_PUBLIC_SUPABASE_ANON_KEY` (см. `.env.example`). Файл `.env` не коммитится.

Pro задаётся локально (покупка / DEV). После входа по email в настройках (при Pro) кнопка «Синхронизировать» отправляет outbox в Postgres и подтягивает изменения с сервера.
