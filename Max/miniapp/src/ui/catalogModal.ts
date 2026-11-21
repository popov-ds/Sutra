import type { MeResponse } from "../api.js";
import type { UiStrings } from "../i18n.js";
import {
  type CatalogKind,
  openCatalogEntryEditor,
  renderCatalogListBody,
  wireCatalogList,
} from "./catalogUi.js";

export type CatalogPickerResult = { ok: true; id: string | null } | { ok: false };

export async function openCatalogPicker(
  kind: CatalogKind,
  t: UiStrings,
  me: MeResponse,
  options: { selectedId: string | null; allowClear?: boolean; title: string },
): Promise<CatalogPickerResult> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "catalog-overlay";

    const close = (result: CatalogPickerResult) => {
      overlay.remove();
      resolve(result);
    };

    const paint = async () => {
      const listBody = await renderCatalogListBody(kind, t, true);
      overlay.innerHTML = `
        <div class="catalog-sheet">
          <header class="catalog-header">
            <button type="button" class="link-back" id="cat-close">← ${escapeHtml(t.back)}</button>
            <p class="form-title">${escapeHtml(options.title)}</p>
            <button type="button" class="link-action" id="cat-add">${escapeHtml(t.add)}</button>
          </header>
          ${
            options.allowClear
              ? `<div class="catalog-clear-row"><button type="button" class="btn-secondary" id="cat-clear">${escapeHtml(t.clearSelection)}</button></div>`
              : ""
          }
          <div class="catalog-body catalog-body--list" id="cat-list-root">${listBody}</div>
        </div>`;

      overlay.querySelector("#cat-close")!.addEventListener("click", () => close({ ok: false }));
      options.allowClear &&
        overlay.querySelector("#cat-clear")!.addEventListener("click", () => close({ ok: true, id: null }));

      overlay.querySelector("#cat-add")!.addEventListener("click", () => {
        openCatalogEntryEditor(overlay, { kind, mode: { type: "add" }, me, t, onSaved: () => void paint() });
      });

      const listRoot = overlay.querySelector("#cat-list-root") as HTMLElement;
      wireCatalogList({
        kind,
        t,
        me,
        root: listRoot,
        pickerMode: true,
        onPick: (id) => close({ ok: true, id }),
        onRefresh: () => void paint(),
        deleteMessage: (name) => t.deleteNamed(name),
      });
    };

    const host = document.getElementById("app") ?? document.body;
    host.appendChild(overlay);
    void paint();
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}