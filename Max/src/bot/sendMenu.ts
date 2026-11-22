import {
  sendMessageWithMenu,
  type MaxInlineButton,
  type MessageTarget,
} from "../max/client.js";
import { mainMenuKeyboard, mainMenuKeyboardCallbacksOnly } from "./keyboard.js";
import type { AppLanguage } from "./i18n.js";

/** Главное inline-меню с запасной клавиатурой (как в чате после /start). */
export async function sendBotMenu(
  target: MessageTarget,
  text: string,
  lang: AppLanguage,
  options?: { markdown?: boolean; extraRows?: MaxInlineButton[][] },
): Promise<void> {
  const uid = target.userId ?? 0;
  const full =
    options?.extraRows && options.extraRows.length > 0
      ? [...options.extraRows, ...mainMenuKeyboard(lang, uid)]
      : mainMenuKeyboard(lang, uid);
  await sendMessageWithMenu(
    target,
    text,
    [mainMenuKeyboardCallbacksOnly(lang), full],
    { format: options?.markdown ? "markdown" : undefined },
  );
}