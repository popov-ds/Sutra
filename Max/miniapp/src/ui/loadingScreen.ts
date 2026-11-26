import { type AppLanguage, strings } from "../i18n.js";

export function setPrimaryTabsVisible(visible: boolean): void {
  document.querySelector(".tabs-primary")?.classList.toggle("tabs--hidden", !visible);
}

/** Полноэкранный индикатор ожидания до первого renderScreen. */
export function setScreenLoading(screen: HTMLElement, lang: AppLanguage = "ru"): void {
  screen.classList.add("screen--loading");
  screen.dataset.dirView = "";
  screen.classList.remove("screen--list", "screen--split");
  const label = strings(lang).loading;
  screen.innerHTML = `<div class="loading-state" role="status" aria-live="polite">
    <span class="loading-spinner" aria-hidden="true"></span>
    <span class="loading-sr">${label}</span>
  </div>`;
}