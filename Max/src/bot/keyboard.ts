import type { MaxInlineButton } from "../max/client.js";
import { strings, type AppLanguage } from "./i18n.js";

/** Кнопки чата MAX: вертикальный столбец (по одной в ряду). */
export async function mainMenuKeyboard(lang: AppLanguage, _maxUserId: number): Promise<MaxInlineButton[][]> {
  const t = strings(lang);
  return [
    [{ type: "message", text: t.btnTariff }],
    [{ type: "message", text: t.btnSettings }],
    [{ type: "message", text: t.btnPro }],
  ];
}