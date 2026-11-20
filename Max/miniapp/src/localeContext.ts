import type { AppLanguage } from "./i18n.js";

let currentLang: AppLanguage = "ru";

export function setAppLanguage(lang: AppLanguage): void {
  currentLang = lang;
}

export function getAppLanguage(): AppLanguage {
  return currentLang;
}