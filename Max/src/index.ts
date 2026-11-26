import { assertBotReady, config, miniAppConfigured } from "./config.js";
import { migrate } from "./db/migrate.js";
import { dbEnabled } from "./db/pool.js";
import { syncPromoCodesFromEnv } from "./db/promo.js";
import { registerBotCommands } from "./bot/commands.js";
import { listenHttp } from "./http/server.js";
import { maxApi } from "./max/client.js";
import { runPolling } from "./bot/poll.js";
import { dispatchPendingNotifications } from "./services/notificationDispatch.js";
import { startMorningDigestScheduler } from "./services/morningDigestScheduler.js";

async function main(): Promise<void> {
  assertBotReady();
  if (dbEnabled()) {
    await migrate();
    const promoN = await syncPromoCodesFromEnv();
    console.log(`Postgres OK, promo codes synced: ${promoN}`);
  } else {
    console.warn("DATABASE_URL не задан — профиль/подписки в bot_users.json (dev only)");
  }
  listenHttp();

  try {
    const me = await maxApi<{ username?: string; user_id?: number }>("GET", "/me");
    console.log("MAX bot:", me?.username ?? me?.user_id ?? "ok");
    await registerBotCommands();
    console.log("MAX bot commands registered");
  } catch (err) {
    console.warn("MAX /me или commands:", err);
  }

  if (dbEnabled()) {
    try {
      await dispatchPendingNotifications();
    } catch (err) {
      console.error("notifications dispatch:", err);
    }
    startMorningDigestScheduler();
  }

  if (miniAppConfigured()) {
    console.log(`Mini App: ${config.publicBaseUrl}/miniapp/`);
  } else {
    console.warn("PUBLIC_BASE_URL без https — Mini App из MAX не откроется.");
  }

  if (config.usePolling && config.webhookSecret) {
    console.warn(
      "MAX_USE_POLLING=1 и WEBHOOK_SECRET заданы — один апдейт может обработаться дважды (webhook + polling). Поставьте MAX_USE_POLLING=0 на VPS с webhook.",
    );
  }
  if (config.usePolling) {
    await runPolling();
  } else {
    console.log("Webhook mode: POST /webhooks/max");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});