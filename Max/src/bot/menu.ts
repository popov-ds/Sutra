import { getBotUser, upsertBotUser } from "../db/botUsers.js";
import { answerCallback, sendMessage, type MaxUpdate } from "../max/client.js";
import { actionForMenuText, allMenuLabels, MENU_PAYLOADS, strings, type AppLanguage } from "./i18n.js";
import { showProInfo } from "./billingFlow.js";
import { mainMenuKeyboard } from "./keyboard.js";
import {
  cancelPromoDialog,
  handlePromoCallback,
  PROMO_ENTER_PAYLOAD,
  tryHandlePromoMessage,
} from "./promoFlow.js";
import { handleSettingsCallback, sendSettingsMain } from "./settingsFlow.js";
import { tariffMessage } from "../services/tariff.js";

const MENU_LABELS = allMenuLabels();

function userIdFromUpdate(update: MaxUpdate): number | null {
  if (update.callback?.user?.user_id != null) {
    return update.callback.user.user_id;
  }
  return update.message?.sender?.user_id ?? null;
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

async function replyWithMenu(maxUserId: number, text: string, lang?: AppLanguage): Promise<void> {
  const l = lang ?? (await langFor(maxUserId));
  await sendMessage({
    userId: maxUserId,
    text,
    buttons: await mainMenuKeyboard(l, maxUserId),
    format: "markdown",
  });
}

export async function sendWelcome(maxUserId: number): Promise<void> {
  await upsertBotUser(maxUserId, {});
  const lang = await langFor(maxUserId);
  const t = strings(lang);
  await replyWithMenu(maxUserId, t.welcome, lang);
}

async function handleAction(maxUserId: number, action: keyof typeof MENU_PAYLOADS): Promise<void> {
  const lang = await langFor(maxUserId);
  const t = strings(lang);
  if (action === "settings") {
    await sendSettingsMain(maxUserId, lang);
    return;
  }
  if (action === "pro") {
    await showProInfo(maxUserId, lang);
    return;
  }

  let text: string = t.unknown;
  if (action === "tariff") {
    text = await tariffMessage(maxUserId, lang);
  } else if (action === "help") {
    text = t.help;
  }

  await replyWithMenu(maxUserId, text, lang);
}

export async function handleUpdate(update: MaxUpdate): Promise<void> {
  const maxUserId = userIdFromUpdate(update);
  if (!maxUserId) return;

  const callbackPayload = update.callback?.payload;
  const callbackId = update.callback?.callback_id;
  if (callbackPayload) {
    if (callbackId) {
      await answerCallback(callbackId).catch((err) => console.error("answerCallback:", err));
    }
    try {
      if (callbackPayload === PROMO_ENTER_PAYLOAD) {
        await handlePromoCallback(maxUserId, await langFor(maxUserId));
      } else if (callbackPayload === "sutra:promo:cancel") {
        await cancelPromoDialog(maxUserId, await langFor(maxUserId));
      } else if (callbackPayload.startsWith("sutra:")) {
        await handleSettingsCallback(maxUserId, callbackPayload);
      } else if (callbackPayload.startsWith("menu:")) {
        const key = callbackPayload.slice("menu:".length) as keyof typeof MENU_PAYLOADS;
        if (key in MENU_PAYLOADS) {
          await handleAction(maxUserId, key);
        }
      }
    } catch (err) {
      console.error("callback handler:", callbackPayload, err);
      const lang = await langFor(maxUserId);
      await sendMessage({
        userId: maxUserId,
        text: strings(lang).botTempError,
        buttons: mainMenuKeyboard(lang, maxUserId),
      });
    }
    return;
  }

  const textRaw = update.message?.body?.text?.trim();
  if (!textRaw) return;
  if (update.message?.sender?.is_bot) return;

  const lang = await langFor(maxUserId);
  if (await tryHandlePromoMessage(maxUserId, textRaw, lang)) return;

  const textLower = textRaw.toLowerCase();
  if (textLower === "/start" || textLower === "старт" || textLower === "start") {
    await sendWelcome(maxUserId);
    return;
  }
  if (textLower === "/help" || textLower === "/tariff" || textLower === "/settings" || textLower === "/pro") {
    const map: Record<string, keyof typeof MENU_PAYLOADS> = {
      "/help": "help",
      "/tariff": "tariff",
      "/settings": "settings",
      "/pro": "pro",
    };
    await handleAction(maxUserId, map[textLower]!);
    return;
  }

  const fromMenu = actionForMenuText(textRaw);
  if (fromMenu) {
    await handleAction(maxUserId, fromMenu);
    return;
  }

  if (MENU_LABELS.has(textRaw)) {
    await replyWithMenu(maxUserId, strings(lang).unknown, lang);
    return;
  }

  await replyWithMenu(maxUserId, strings(lang).unknown, lang);
}