import type { MeResponse } from "../api.js";
import {
  createClientRequestRecord,
  createProductRecord,
  deleteClientRequestRecord,
  deleteProductRecord,
  listClientRequests,
  listProducts,
  persistLocalChanges,
  updateClientRequestRecord,
  updateProductRecord,
} from "../db/localDb.js";
import type { UiStrings } from "../i18n.js";
import { userErrorMessage } from "../i18n.js";
import { confirmDeleteWithAction } from "./confirm.js";
import { listRowDeleteIcon, listRowEditIcon } from "./listScreen.js";

export type CatalogKind = "product" | "clientRequest";

type CatalogItem = { id: string; title: string; meta?: string; icon: string };

export type CatalogListOptions = {
  kind: CatalogKind;
  t: UiStrings;
  me: MeResponse;
  root: HTMLElement;
  /** Picker: один тап по строке — выбор. Иначе — открыть редактор. */
  pickerMode?: boolean;
  onPick?: (id: string) => void;
  onRefresh: () => void;
  deleteMessage: (name: string) => string;
};

export async function renderCatalogListBody(
  kind: CatalogKind,
  t: UiStrings,
  showEditOnRow = false,
): Promise<string> {
  const items: CatalogItem[] =
    kind === "product"
      ? (await listProducts()).map((p) => ({
          id: p.id,
          title: p.name,
          meta: t.productDurationLine(p.durationDays),
          icon: "inventory_2",
        }))
      : (await listClientRequests()).map((r) => ({
          id: r.id,
          title: r.name,
          icon: "help_outline",
        }));

  if (items.length === 0) {
    return `<p class="muted">${escapeHtml(kind === "product" ? t.noProducts : t.noRequests)}</p>`;
  }

  return items
    .map(
      (item) =>
        `<div class="list-row card">
          <button type="button" class="list-row-main list-row-main--dir" data-catalog-open="${escapeAttr(item.id)}">
            <span class="dir-icon-wrap"><span class="material-symbols-outlined" aria-hidden="true">${item.icon}</span></span>
            <div class="list-row-text">
              <strong>${escapeHtml(item.title)}</strong>
              ${item.meta ? `<br><span class="muted">${escapeHtml(item.meta)}</span>` : ""}
            </div>
          </button>
          ${
            showEditOnRow
              ? `<button type="button" class="list-row-edit" data-catalog-edit="${escapeAttr(item.id)}" aria-label="${escapeAttr(t.edit)}">${listRowEditIcon()}</button>`
              : ""
          }
          <button type="button" class="list-row-delete" data-catalog-del="${escapeAttr(item.id)}" aria-label="${escapeAttr(t.delete)}">${listRowDeleteIcon()}</button>
        </div>`,
    )
    .join("");
}

export function wireCatalogList(options: CatalogListOptions): void {
  const { kind, t, me, root, pickerMode, onPick, onRefresh, deleteMessage } = options;

  root.querySelectorAll("[data-catalog-open]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = (el as HTMLElement).dataset.catalogOpen!;
      if (pickerMode && onPick) {
        onPick(id);
        return;
      }
      openCatalogEntryEditor(root, { kind, mode: { type: "edit", id }, me, t, onSaved: onRefresh });
    });
  });

  root.querySelectorAll("[data-catalog-edit]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const id = (el as HTMLElement).dataset.catalogEdit!;
      openCatalogEntryEditor(root, { kind, mode: { type: "edit", id }, me, t, onSaved: onRefresh });
    });
  });

  root.querySelectorAll("[data-catalog-del]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const id = (el as HTMLElement).dataset.catalogDel!;
      const title =
        kind === "product"
          ? (root.querySelector(`[data-catalog-open="${id}"] strong`)?.textContent ?? t.deleteFallbackProduct)
          : (root.querySelector(`[data-catalog-open="${id}"] strong`)?.textContent ?? t.deleteFallbackRequest);
      void (async () => {
        const ok = await confirmDeleteWithAction(t, deleteMessage(title), async () => {
          if (kind === "product") await deleteProductRecord(id);
          else await deleteClientRequestRecord(id);
          await persistLocalChanges();
        });
        if (ok) onRefresh();
      })();
    });
  });
}

export function openCatalogEntryEditor(
  mount: HTMLElement,
  options: {
    kind: CatalogKind;
    mode: { type: "add" } | { type: "edit"; id: string };
    me: MeResponse;
    t: UiStrings;
    onSaved: () => void;
  },
): void {
  const { kind, mode, me, t, onSaved } = options;
  const overlay = document.createElement("div");
  overlay.className = "catalog-overlay catalog-overlay--editor";

  const isNew = mode.type === "add";
  const title = isNew
    ? kind === "product"
      ? t.productNew
      : t.requestNew
    : kind === "product"
      ? t.productEdit
      : t.requestEdit;

  overlay.innerHTML = `
    <div class="catalog-sheet">
      <header class="catalog-header">
        <button type="button" class="link-back" id="cat-editor-close">← ${escapeHtml(t.back)}</button>
        <p class="form-title">${escapeHtml(title)}</p>
        <span class="catalog-header-spacer" aria-hidden="true"></span>
      </header>
      <div class="catalog-body">
        <div class="catalog-form card">
          <label class="field-label">${escapeHtml(t.titleLabel)}<input id="cat-name" class="input--placeholder-muted" placeholder="${escapeAttr(t.titlePlaceholder)}" /></label>
          ${
            kind === "product"
              ? `<label class="field-label">${escapeHtml(t.courseDurationLabel)}<input id="cat-days" type="number" inputmode="numeric" value="30" /></label>`
              : ""
          }
          <p class="error" id="cat-error" hidden></p>
          <div class="form-actions catalog-form-actions">
            <button type="button" class="btn-secondary" id="cat-editor-cancel">${escapeHtml(t.cancel)}</button>
            <button type="button" class="primary" id="cat-editor-save">${escapeHtml(t.save)}</button>
          </div>
        </div>
      </div>
    </div>`;

  const host = document.getElementById("app") ?? document.body;
  host.appendChild(overlay);

  const close = () => overlay.remove();

  void (async () => {
    if (!isNew && mode.type === "edit") {
      if (kind === "product") {
        const p = (await listProducts()).find((x) => x.id === mode.id);
        (overlay.querySelector("#cat-name") as HTMLInputElement).value = p?.name ?? "";
        (overlay.querySelector("#cat-days") as HTMLInputElement).value = String(p?.durationDays ?? 30);
      } else {
        const r = (await listClientRequests()).find((x) => x.id === mode.id);
        (overlay.querySelector("#cat-name") as HTMLInputElement).value = r?.name ?? "";
      }
    }
  })();

  overlay.querySelector("#cat-editor-close")!.addEventListener("click", close);
  overlay.querySelector("#cat-editor-cancel")!.addEventListener("click", close);
  overlay.querySelector("#cat-editor-save")!.addEventListener("click", () => {
    void (async () => {
      const err = overlay.querySelector("#cat-error") as HTMLElement;
      err.hidden = true;
      try {
        const name = (overlay.querySelector("#cat-name") as HTMLInputElement).value;
        if (kind === "product") {
          const days = Number((overlay.querySelector("#cat-days") as HTMLInputElement).value);
          if (mode.type === "add") await createProductRecord(name, days, me.tier === "pro", me.freeRecordLimit);
          else await updateProductRecord(mode.id, name, days);
        } else if (mode.type === "add") {
          await createClientRequestRecord(name, me.tier === "pro", me.freeRecordLimit);
        } else await updateClientRequestRecord(mode.id, name);
        await persistLocalChanges();
        close();
        onSaved();
      } catch (e) {
        err.textContent = userErrorMessage(e, t);
        err.hidden = false;
      }
    })();
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}