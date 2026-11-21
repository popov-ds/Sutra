import type { MeResponse } from "./api.js";
import type { UiStrings } from "./i18n.js";
import { listScreenLayout, setListScreenMode } from "./ui/listScreen.js";
import {
  openCatalogEntryEditor,
  renderCatalogListBody,
  wireCatalogList,
  type CatalogKind,
} from "./ui/catalogUi.js";

export type DirScreen = "home" | "products" | "client-requests";

export async function renderDirectories(
  screen: HTMLElement,
  me: MeResponse,
  t: UiStrings,
  view: DirScreen,
  onNavigate: (next: DirScreen) => void,
  onRefresh: () => void,
): Promise<void> {
  screen.dataset.dirView = view;

  if (view === "home") {
    setListScreenMode(screen, false);
    screen.innerHTML = `
    <button type="button" class="directory-row card" data-dir-go="products">
      <span class="dir-icon-wrap"><span class="material-symbols-outlined" aria-hidden="true">inventory_2</span></span>
      <span class="dir-label">${escapeHtml(t.dirProducts)}</span>
      <span class="material-symbols-outlined chevron" aria-hidden="true">chevron_right</span>
    </button>
    <button type="button" class="directory-row card" data-dir-go="client-requests">
      <span class="dir-icon-wrap"><span class="material-symbols-outlined" aria-hidden="true">help_outline</span></span>
      <span class="dir-label">${escapeHtml(t.dirClientRequests)}</span>
      <span class="material-symbols-outlined chevron" aria-hidden="true">chevron_right</span>
    </button>
  `;
    screen.querySelectorAll("[data-dir-go]").forEach((el) => {
      el.addEventListener("click", () => onNavigate((el as HTMLElement).dataset.dirGo as DirScreen));
    });
    return;
  }

  const kind: CatalogKind = view === "products" ? "product" : "clientRequest";
  const backLabel = view === "products" ? t.backToDirectories : t.backToDirectories;
  const addHandler = () => openCatalogEntryEditor(screen, { kind, mode: { type: "add" }, me, t, onSaved: onRefresh });

  const listBody = await renderCatalogListBody(kind, t, false);
  const sticky =
    `<button type="button" class="link-back" id="dir-back">${escapeHtml(backLabel)}</button>` +
    `<div class="toolbar"><button type="button" class="btn-secondary" id="catalog-add">+ ${escapeHtml(t.add)}</button></div>`;

  setListScreenMode(screen, true);
  screen.innerHTML = listScreenLayout(sticky, `<div id="catalog-list-root">${listBody}</div>`);

  document.getElementById("dir-back")!.onclick = () => onNavigate("home");
  document.getElementById("catalog-add")!.onclick = addHandler;

  const listRoot = document.getElementById("catalog-list-root")!;
  wireCatalogList({
    kind,
    t,
    me,
    root: listRoot,
    onRefresh,
    deleteMessage: (name) => t.deleteNamed(name),
  });
}

export function dirViewToDataset(view: DirScreen): string {
  return view;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}