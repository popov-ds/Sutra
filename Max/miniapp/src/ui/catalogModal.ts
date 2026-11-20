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
import { confirmDelete } from "./confirm.js";

export type CatalogKind = "product" | "clientRequest";

export type CatalogPickerResult = { ok: true; id: string | null } | { ok: false };

/** Полноэкранный каталог как в Android: CRUD + двойное нажатие для выбора. */
export async function openCatalogPicker(
  kind: CatalogKind,
  t: UiStrings,
  me: MeResponse,
  options: { selectedId: string | null; allowClear?: boolean; title: string },
): Promise<CatalogPickerResult> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "catalog-overlay";
    let selectedId = options.selectedId;
    let highlightId: string | null = null;
    let mode: "list" | "add" | "edit" = "list";

    const close = (result: CatalogPickerResult) => {
      overlay.remove();
      resolve(result);
    };

    const render = async () => {
      const items =
        kind === "product"
          ? (await listProducts()).map((p) => ({
              id: p.id,
              title: p.name,
              meta: t.durationDays(p.durationDays),
            }))
          : (await listClientRequests()).map((r) => ({ id: r.id, title: r.name, meta: "" }));

      const listHtml =
        items.length === 0 && mode === "list"
          ? `<p class="muted">${escapeHtml(t.catalogEmpty)}</p>`
          : items
              .map((item) => {
                const sel = item.id === selectedId || item.id === highlightId;
                return `<button type="button" class="catalog-row ${sel ? "catalog-row--on" : ""}" data-pick="${item.id}">
                  <strong>${escapeHtml(item.title)}</strong>
                  ${item.meta ? `<span class="muted">${escapeHtml(item.meta)}</span>` : ""}
                </button>`;
              })
              .join("");

      const formHtml =
        mode !== "list"
          ? `<div class="catalog-form card">
              <p class="form-title">${mode === "add" ? escapeHtml(t.catalogEntryNew) : escapeHtml(t.catalogEntryEdit)}</p>
              <label class="field-label">${escapeHtml(t.titleLabel)}<input id="cat-name" class="input--placeholder-muted" placeholder="${escapeAttr(t.titlePlaceholder)}" /></label>
              ${
                kind === "product"
                  ? `<label class="field-label">${escapeHtml(t.courseDurationLabel)}<input id="cat-days" type="number" inputmode="numeric" value="30" /></label>`
                  : ""
              }
              <p class="error" id="cat-error" hidden></p>
              <div class="form-actions catalog-form-actions">
                <button type="button" class="btn-secondary" id="cat-cancel-form">${escapeHtml(t.cancel)}</button>
                <button type="button" class="primary" id="cat-save-form">${escapeHtml(t.save)}</button>
              </div>
            </div>`
          : "";

      overlay.innerHTML = `
        <motion />
        <div class="catalog-sheet">
          <header class="catalog-header">
            <button type="button" class="link-back" id="cat-close">← ${escapeHtml(t.back)}</button>
            <p class="form-title">${escapeHtml(options.title)}</p>
            ${options.allowClear ? `<button type="button" class="link-action" id="cat-clear">${escapeHtml(t.clearSelection)}</button>` : ""}
          </header>
          <div class="catalog-body">${formHtml || listHtml}</div>
          ${
            mode === "list"
              ? `<footer class="catalog-toolbar">
                  <button type="button" class="catalog-tool" id="cat-add">${escapeHtml(t.add)}</button>
                  <button type="button" class="catalog-tool" id="cat-edit">${escapeHtml(t.edit)}</button>
                  <button type="button" class="catalog-tool catalog-tool--danger" id="cat-del">${escapeHtml(t.delete)}</button>
                </footer>`
              : ""
          }
        </div>`;

      overlay.innerHTML = overlay.innerHTML.replace("<motion />", "");

      overlay.querySelector("#cat-close")!.addEventListener("click", () => close({ ok: false }));
      options.allowClear &&
        overlay.querySelector("#cat-clear")!.addEventListener("click", () => close({ ok: true, id: null }));

      overlay.querySelectorAll("[data-pick]").forEach((el) => {
        el.addEventListener("click", () => {
          const id = (el as HTMLElement).dataset.pick!;
          if (highlightId === id) {
            selectedId = id;
            close({ ok: true, id });
            return;
          }
          highlightId = id;
          selectedId = id;
          void render();
        });
      });

      if (mode === "list") {
        overlay.querySelector("#cat-add")!.addEventListener("click", () => {
          selectedId = null;
          highlightId = null;
          mode = "add";
          void render().then(() => {
            (overlay.querySelector("#cat-name") as HTMLInputElement).focus();
          });
        });
        overlay.querySelector("#cat-edit")!.addEventListener("click", async () => {
          if (!selectedId) return;
          mode = "edit";
          await render();
          const item = items.find((i) => i.id === selectedId);
          (overlay.querySelector("#cat-name") as HTMLInputElement).value = item?.title ?? "";
          if (kind === "product") {
            const prod = (await listProducts()).find((p) => p.id === selectedId);
            (overlay.querySelector("#cat-days") as HTMLInputElement).value = String(prod?.durationDays ?? 30);
          }
        });
        overlay.querySelector("#cat-del")!.addEventListener("click", () => {
          if (!selectedId) return;
          const name = items.find((i) => i.id === selectedId)?.title ?? t.deleteFallbackEntry;
          void (async () => {
            if (!(await confirmDelete(t, t.deleteNamed(name)))) return;
            try {
              if (kind === "product") await deleteProductRecord(selectedId!);
              else await deleteClientRequestRecord(selectedId!);
              await persistLocalChanges();
              selectedId = null;
              highlightId = null;
              void render();
            } catch (e) {
              alert(userErrorMessage(e, t));
            }
          })();
        });
      } else {
        overlay.querySelector("#cat-cancel-form")!.addEventListener("click", () => {
          mode = "list";
          void render();
        });
        overlay.querySelector("#cat-save-form")!.addEventListener("click", () => {
          void (async () => {
            const err = overlay.querySelector("#cat-error") as HTMLElement;
            err.hidden = true;
            try {
              const name = (overlay.querySelector("#cat-name") as HTMLInputElement).value;
              if (kind === "product") {
                const days = Number((overlay.querySelector("#cat-days") as HTMLInputElement).value);
                if (mode === "add") await createProductRecord(name, days, me.tier === "pro", me.freeRecordLimit);
                else await updateProductRecord(selectedId!, name, days);
              } else if (mode === "add") {
                await createClientRequestRecord(name, me.tier === "pro", me.freeRecordLimit);
              } else await updateClientRequestRecord(selectedId!, name);
              await persistLocalChanges();
              mode = "list";
              void render();
            } catch (e) {
              err.textContent = userErrorMessage(e, t);
              err.hidden = false;
            }
          })();
        });
      }
    };

    const host = document.getElementById("app") ?? document.body;
    host.appendChild(overlay);
    void render();
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}