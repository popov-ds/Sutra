import { assertBotReady, config, miniAppConfigured } from "./config.js";
import { registerBotCommands } from "./bot/commands.js";
import { listenHttp } from "./http/server.js";
import { maxApi } from "./max/client.js";
import { runPolling } from "./bot/poll.js";

async function main(): Promise<void> {
  assertBotReady();
  listenHttp();

  try {
    const me = await maxApi<{ username?: string; user_id?: number }>("GET", "/me");
    console.log("MAX bot:", me?.username ?? me?.user_id ?? "ok");
    await registerBotCommands();
    console.log("MAX bot commands registered");
  } catch (err) {
    console.warn("MAX /me или commands:", err);
  }

  if (miniAppConfigured()) {
    console.log(`Mini App: ${config.publicBaseUrl}/miniapp/`);
  } else {
    console.warn("PUBLIC_BASE_URL без https — Mini App из MAX не откроется.");
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