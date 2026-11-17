/** Раскладка: шапка + скролл + (опционально) док над нижними вкладками. */
export function setScreenChrome(screen: HTMLElement, mode: "scroll" | "list" | "split"): void {
  screen.classList.remove("screen--list", "screen--split");
  if (mode === "list") screen.classList.add("screen--list");
  if (mode === "split") screen.classList.add("screen--split");
}

export function splitLayout(headHtml: string, bodyHtml: string, dockHtml?: string): string {
  const dock = dockHtml ? `<footer class="screen-action-dock">${dockHtml}</footer>` : "";
  return `<div class="screen-split">
    <header class="screen-split-head">${headHtml}</header>
    <div class="screen-split-body">${bodyHtml}</div>
    ${dock}
  </div>`;
}