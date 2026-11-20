import type { MaxInlineButton } from "../max/client.js";
import { MENU_PAYLOADS, strings, type AppLanguage } from "./i18n.js";

/** Callback-кнопки: MAX стабильно доставляет payload (message-кнопки часто не совпадают с текстом). */
export function mainMenuKeyboard(lang: AppLanguage, _maxUserId: number): MaxInlineButton[][] {
  const t = strings(lang);
  return [
    [{ type: "callback", text: t.btnTariff, payload: MENU_PAYLOADS.tariff }],
    [{ type: "callback", text: t.btnSettings, payload: MENU_PAYLOADS.settings }],
    [{ type: "callback", text: t.btnPro, payload: MENU_PAYLOADS.pro }],
  ];
}