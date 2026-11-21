export function setListScreenMode(screen: HTMLElement, enabled: boolean): void {
  screen.classList.toggle("screen--list", enabled);
}

export function listScreenLayout(stickyHtml: string, listBodyHtml: string): string {
  return `<div class="list-screen">
    <div class="list-sticky">${stickyHtml}</div>
    <div class="list-scroll">${listBodyHtml}</div>
  </div>`;
}

export function listRowDeleteIcon(): string {
  return `<span class="material-symbols-outlined" aria-hidden="true">delete</span>`;
}

export function listRowEditIcon(): string {
  return `<span class="material-symbols-outlined" aria-hidden="true">edit</span>`;
}