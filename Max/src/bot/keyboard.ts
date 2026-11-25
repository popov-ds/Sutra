import { config, miniAppConfigured } from "../config.js";
import type { MaxInlineButton } from "../max/client.js";
import { MENU_PAYLOADS, strings, type AppLanguage } from "./i18n.js";
import { supportConfigured, supportFormUrl } from "./supportLink.js";

/** Inline-меню: до 2 кнопок в ряду (рекомендация MAX по длине текста). */
export function mainMenuKeyboard(lang: AppLanguage, maxUserId: number): MaxInlineButton[][] {
  const t = strings(lang);
  const rows: MaxInlineButton[][] = [];

  if (config.maxBotWebApp) {
    rows.push([{ type: "open_app", text: t.btnSutra, web_app: config.maxBotWebApp }]);
  } else if (miniAppConfigured()) {
    rows.push([
      {
        type: "link",
        text: t.btnSutra,
        url: `${config.publicBaseUrl}/miniapp/`,
      },
    ]);
  }

  const rowSupport: MaxInlineButton[] = [
    { type: "callback", text: t.btnSettings, payload: MENU_PAYLOADS.settings },
  ];
  if (supportConfigured()) {
    rowSupport.push({ type: "link", text: t.btnSupport, url: supportFormUrl(maxUserId, lang) });
  }

  rows.push(
    [
      { type: "callback", text: t.btnTariff, payload: MENU_PAYLOADS.tariff },
      { type: "callback", text: t.btnPro, payload: MENU_PAYLOADS.pro },
    ],
    rowSupport,
  );

  return rows;
}

/** Только callback — если link/open_app ломают клавиатуру в API. */
export function mainMenuKeyboardCallbacksOnly(lang: AppLanguage, maxUserId: number): MaxInlineButton[][] {
  const t = strings(lang);
  const rowSupport: MaxInlineButton[] = [
    { type: "callback", text: t.btnSettings, payload: MENU_PAYLOADS.settings },
  ];
  if (supportConfigured()) {
    rowSupport.push({ type: "link", text: t.btnSupport, url: supportFormUrl(maxUserId, lang) });
  }

  return [
    [
      { type: "callback", text: t.btnTariff, payload: MENU_PAYLOADS.tariff },
      { type: "callback", text: t.btnPro, payload: MENU_PAYLOADS.pro },
    ],
    rowSupport,
  ];
}