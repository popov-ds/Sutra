import { getBotUser, upsertBotUser } from "../db/botUsers.js";
import {
  answerCallback,
  chatIdFromUpdate,
  sendMessageWithMenu,
  type MaxUpdate,
  type MessageTarget,
} from "../max/client.js";
import { actionForMenuText, MENU_PAYLOADS, strings, type AppLanguage } from "./i18n.js";
import { handleProCallback, showProInfo } from "./billingFlow.js";
import { mainMenuKeyboard, mainMenuKeyboardCallbacksOnly } from "./keyboard.js";
import { sendBotMenu } from "./sendMenu.js";
import {
  clearPromoAwaitForUser,
  handlePromoCallback,
  PROMO_CANCEL_PAYLOAD,
  PROMO_ENTER_PAYLOAD,
  tryHandlePromoMessage,
} from "./promoFlow.js";
import { handleSettingsCallback, sendSettingsMain } from "./settingsFlow.js";
import { tariffMessage } from "../services/tariff.js";

function userIdFromUpdate(update: MaxUpdate): number | null {
  if (update.callback?.user?.user_id != null) {
    return update.callback.user.user_id;
  }
  if (update.user?.user_id != null) {
    return update.user.user_id;
  }
  return update.message?.sender?.user_id ?? null;
}

function messageTargetFromUpdate(update: MaxUpdate): MessageTarget | null {
  const userId = userIdFromUpdate(update);
  if (userId == null) return null;
  const chatId = chatIdFromUpdate(update);
  return chatId != null ? { userId, chatId } : { userId };
}

function localeLanguage(locale: string | undefined): AppLanguage | null {
  const l = locale?.trim().toLowerCase() ?? "";
  if (l.startsWith("en")) return "en";
  if (l.startsWith("ru")) return "ru";
  return null;
}

async function langFor(maxUserId: number): Promise<AppLanguage> {
  try {
    const u = await getBotUser(maxUserId);
    return u?.language ?? "ru";
  } catch (err) {
    console.error("langFor:", err);
    return "ru";
  }
}

async function replyWithMenu(
  target: MessageTarget,
  text: string,
  lang?: AppLanguage,
  options?: { markdown?: boolean },
): Promise<void> {
  const maxUserId = target.userId;
  const l = lang ?? (maxUserId != null ? await langFor(maxUserId) : "ru");
  await sendBotMenu(target, text, l, { markdown: options?.markdown });
}

async function promptMainMenu(target: MessageTarget, lang?: AppLanguage): Promise<void> {
  const maxUserId = target.userId;
  const l = lang ?? (maxUserId != null ? await langFor(maxUserId) : "ru");
  await replyWithMenu(target, strings(l).unknown, l);
}

export async function sendWelcome(target: MessageTarget): Promise<void> {
  const maxUserId = target.userId;
  if (maxUserId == null) return;
  await upsertBotUser(maxUserId, {});
  const lang = await langFor(maxUserId);
  const t = strings(lang);
  await replyWithMenu(target, t.welcome, lang);
}

async function handleAction(
  target: MessageTarget,
  action: keyof typeof MENU_PAYLOADS,
): Promise<void> {
  const maxUserId = target.userId;
  if (maxUserId == null) return;
  const lang = await langFor(maxUserId);
  const t = strings(lang);
  if (action === "settings") {
    await sendSettingsMain(target, lang);
    return;
  }
  if (action === "pro") {
    await showProInfo(target, lang);
    return;
  }

  let text: string = t.unknown;
  if (action === "tariff") {
    text = await tariffMessage(maxUserId, lang);
  }

  await replyWithMenu(target, text, lang);
}

export async function handleUpdate(update: MaxUpdate): Promise<void> {
  if (update.update_type === "bot_started") {
    const target = messageTargetFromUpdate(update);
    if (!target?.userId) return;
    try {
      const lang = localeLanguage(update.user_locale);
      if (lang) await upsertBotUser(target.userId, { language: lang });
      await sendWelcome(target);
    } catch (err) {
      console.error("bot_started:", err);
      const lang = localeLanguage(update.user_locale) ?? "ru";
      await sendMessageWithMenu(target, strings(lang).welcome, [mainMenuKeyboardCallbacksOnly(lang, target.userId!)]).catch((e) =>
        console.error("bot_started fallback:", e),
      );
    }
    return;
  }

  const target = messageTargetFromUpdate(update);
  const maxUserId = target?.userId;
  if (!target || maxUserId == null) return;

  const callbackPayload = update.callback?.payload;
  const callbackId = update.callback?.callback_id;
  if (callbackPayload) {
    if (callbackId) {
      await answerCallback(callbackId).catch((err) => console.error("answerCallback:", err));
    }
    try {
      if (callbackPayload === PROMO_ENTER_PAYLOAD) {
        await handlePromoCallback(target, await langFor(maxUserId));
      } else if (callbackPayload === PROMO_CANCEL_PAYLOAD) {
        clearPromoAwaitForUser(maxUserId);
        await showProInfo(target, await langFor(maxUserId));
      } else if (callbackPayload.startsWith("sutra:pro:")) {
        await handleProCallback(target, callbackPayload);
      } else if (callbackPayload.startsWith("sutra:set:") || callbackPayload.startsWith("sutra:lang:")) {
        await handleSettingsCallback(target, callbackPayload);
      } else if (callbackPayload.startsWith("menu:")) {
        const key = callbackPayload.slice("menu:".length) as keyof typeof MENU_PAYLOADS;
        if (key in MENU_PAYLOADS) {
          await handleAction(target, key);
        }
      }
    } catch (err) {
      console.error("callback handler:", callbackPayload, err);
      const lang = await langFor(maxUserId);
      await sendMessageWithMenu(target, strings(lang).botTempError, [
        mainMenuKeyboardCallbacksOnly(lang, maxUserId),
        mainMenuKeyboard(lang, maxUserId),
      ]);
    }
    return;
  }

  const textRaw =
    update.message?.body?.text?.trim() ??
    (update.message as { text?: string } | undefined)?.text?.trim();
  if (!textRaw) return;
  if (update.message?.sender?.is_bot) return;

  const lang = await langFor(maxUserId);
  if (await tryHandlePromoMessage(maxUserId, textRaw, lang, target)) return;

  const textLower = textRaw.toLowerCase();
  if (textLower === "/start" || textLower === "старт" || textLower === "start") {
    await sendWelcome(target);
    return;
  }
  if (textLower === "/tariff" || textLower === "/settings" || textLower === "/pro") {
    const map: Record<string, keyof typeof MENU_PAYLOADS> = {
      "/tariff": "tariff",
      "/settings": "settings",
      "/pro": "pro",
    };
    await handleAction(target, map[textLower]!);
    return;
  }

  const fromMenu = actionForMenuText(textRaw);
  if (fromMenu) {
    await handleAction(target, fromMenu);
    return;
  }

  // Любое сообщение не-команда (и неизвестная /команда) — подсказка + inline-меню
  await promptMainMenu(target, lang);
}