import { config } from "../config.js";

const API_BASE = "https://platform-api2.max.ru";

export type MaxInlineButton =
  | { type: "link"; text: string; url: string }
  | { type: "open_app"; text: string; url?: string; web_app?: string; payload?: string }
  | { type: "callback"; text: string; payload: string }
  | { type: "message"; text: string };

export type SendMessageParams = {
  userId?: number;
  chatId?: number;
  text: string;
  buttons?: MaxInlineButton[][];
  format?: "markdown" | "html";
};

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

export async function sendMessage(params: SendMessageParams): Promise<void> {
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

  await maxApi("POST", "/messages", query, {
    text: params.text,
    format: params.format,
    attachments,
  });
}

export type MaxUpdate = {
  update_type?: string;
  timestamp?: number;
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

/** Подтверждение нажатия inline-кнопки (обязательно для MAX message_callback). */
export async function answerCallback(callbackId: string): Promise<void> {
  await maxApi("POST", "/answers", { callback_id: callbackId }, {});
}

export async function getUpdates(marker?: number): Promise<{ updates: MaxUpdate[]; marker?: number }> {
  const query: Record<string, string | number> = { limit: 50, timeout: 25 };
  if (marker !== undefined) query.marker = marker;
  return maxApi("GET", "/updates", query);
}