import { config } from "../config.js";

const API_BASE = "https://platform-api2.max.ru";

export type MaxInlineButton =
  | { type: "link"; text: string; url: string }
  | { type: "open_app"; text: string; url?: string; web_app?: string; payload?: string }
  | { type: "callback"; text: string; payload: string }
  | { type: "message"; text: string };

export type MessageTarget = {
  userId?: number;
  chatId?: number;
};

export type SendMessageParams = MessageTarget & {
  text: string;
  buttons?: MaxInlineButton[][];
  format?: "markdown" | "html";
};

function inlineKeyboardInResponse(response: unknown): boolean {
  const r = response as {
    body?: { attachments?: { type?: string }[] };
    message?: { body?: { attachments?: { type?: string }[] } };
  };
  const attachments = r.message?.body?.attachments ?? r.body?.attachments;
  return Array.isArray(attachments) && attachments.some((a) => a?.type === "inline_keyboard");
}

export async function maxApi<T>(
  method: string,
  path: string,
  query?: Record<string, string | number | undefined>,
  body?: unknown,
): Promise<T> {
  const url = new URL(API_BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: config.maxBotToken,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`MAX API ${method} ${path}: ${res.status} ${raw}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

async function postMessage(params: SendMessageParams): Promise<void> {
  const query: Record<string, string | number | undefined> = {};
  if (params.userId) query.user_id = params.userId;
  if (params.chatId) query.chat_id = params.chatId;

  const attachments =
    params.buttons && params.buttons.length > 0
      ? [
          {
            type: "inline_keyboard",
            payload: { buttons: params.buttons },
          },
        ]
      : undefined;

  const res = await maxApi<unknown>("POST", "/messages", query, {
    text: params.text,
    format: params.format,
    attachments,
  });

  if (attachments && !inlineKeyboardInResponse(res)) {
    console.warn("MAX POST /messages: в ответе нет inline_keyboard (сообщение уже отправлено)");
  }
}

export async function sendMessage(params: SendMessageParams): Promise<void> {
  await postMessage(params);
}

/** Одна доставка за раз: иначе chat_id и user_id дают два одинаковых сообщения в диалоге. */
function deliveryAttempts(target: MessageTarget): MessageTarget[] {
  const attempts: MessageTarget[] = [];
  if (target.userId != null) attempts.push({ userId: target.userId });
  if (target.chatId != null) attempts.push({ chatId: target.chatId });
  return attempts;
}

/** Отправить сообщение с клавиатурой; при ошибке API — другой id, затем упрощённая клавиатура. */
export async function sendMessageWithMenu(
  target: MessageTarget,
  text: string,
  keyboards: MaxInlineButton[][][],
  options?: { format?: "markdown" | "html" },
): Promise<void> {
  let lastErr: unknown;
  for (const buttons of keyboards) {
    for (const attempt of deliveryAttempts(target)) {
      try {
        await sendMessage({ ...attempt, text, buttons, format: options?.format });
        return;
      } catch (err) {
        lastErr = err;
        console.error("sendMessageWithMenu:", err);
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Не удалось отправить меню с кнопками");
}

export type MaxUpdate = {
  update_type?: string;
  timestamp?: number;
  chat_id?: number;
  user_locale?: string;
  payload?: string;
  user?: {
    user_id?: number;
    name?: string;
    is_bot?: boolean;
  };
  message?: {
    body?: { text?: string };
    sender?: { user_id?: number; name?: string; is_bot?: boolean };
    recipient?: { chat_id?: number; user_id?: number };
  };
  callback?: {
    payload?: string;
    callback_id?: string;
    user?: { user_id?: number };
  };
};

export function chatIdFromUpdate(update: MaxUpdate): number | undefined {
  const id = update.chat_id ?? update.message?.recipient?.chat_id;
  return id != null && Number.isFinite(id) ? id : undefined;
}

/** Подтверждение нажатия inline-кнопки (обязательно для MAX message_callback). */
export async function answerCallback(callbackId: string): Promise<void> {
  await maxApi("POST", "/answers", { callback_id: callbackId }, {});
}

export async function getUpdates(marker?: number): Promise<{ updates: MaxUpdate[]; marker?: number }> {
  const query: Record<string, string | number> = { limit: 50, timeout: 25 };
  if (marker !== undefined) query.marker = marker;
  return maxApi("GET", "/updates", query);
}