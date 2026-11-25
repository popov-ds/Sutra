import { maxApi } from "../max/client.js";

const COMMANDS = [
  { name: "start", description: "Главное меню" },
  { name: "tariff", description: "Тариф и лимиты" },
  { name: "settings", description: "Настройки" },
  { name: "pro", description: "Подписка Pro" },
] as const;

/** Подсказки «/» в чате MAX (аналог setMyCommands в Telegram, без reply-клавиатуры). */
export async function registerBotCommands(): Promise<void> {
  await maxApi("PATCH", "/me/commands", undefined, { commands: [...COMMANDS] });
}