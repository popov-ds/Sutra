-- Триггер при INSERT выставлял last_notification_id = MAX(notifications) без отправки
-- (в т.ч. при backfill users) — рассылка при рестарте никого не находила.
-- Проставление last_notification_id только из кода (ensureBotUser).

DROP TRIGGER IF EXISTS tr_users_last_notification ON users;
DROP FUNCTION IF EXISTS users_set_last_notification_id();