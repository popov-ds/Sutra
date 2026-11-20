import type { MeResponse } from "../api.js";
import { getClient, listProducts, persistLocalChanges, recordPurchaseForClient } from "../db/localDb.js";
import { buildPurchaseTasks } from "../domain/touchPlan.js";
import { assertIsoDate, formatLocaleDate, todayIso } from "../domain/dates.js";
import type { UiStrings } from "../i18n.js";
import { taskDisplayTitle, userErrorMessage } from "../i18n.js";
import { openCatalogPicker } from "../ui/catalogModal.js";
import { setScreenChrome, splitLayout } from "../ui/screenChrome.js";

export type PurchaseNewDraft = {
  productId: string | null;
  productName: string;
  durationDays: number;
  purchasedOn: string;
};

export function emptyPurchaseNewDraft(): PurchaseNewDraft {
  return { productId: null, productName: "", durationDays: 30, purchasedOn: todayIso() };
}

export async function renderPurchaseNew(
  screen: HTMLElement,
  me: MeResponse,
  t: UiStrings,
  clientId: string,
  draft: PurchaseNewDraft,
  onDraftChange: (next: PurchaseNewDraft) => void,
  onBack: () => void,
): Promise<void> {
  const client = await getClient(clientId);
  if (!client) {
    setScreenChrome(screen, "scroll");
    screen.innerHTML = `<p class="muted">${escapeHtml(t.clientNotFound)}</p>`;
    return;
  }

  let productId = draft.productId;
  let productName = draft.productName;
  let durationDays = draft.durationDays;
  let purchasedOn = draft.purchasedOn;

  const syncDraft = () => {
    onDraftChange({ productId, productName, durationDays, purchasedOn });
  };

  const draw = () => {
    let previewHtml = "";
    if (productId) {
      try {
        const iso = assertIsoDate(purchasedOn);
        let seq = 0;
        const tasks = buildPurchaseTasks({
          purchaseId: "preview",
          clientId,
          product: { name: productName, durationDays },
          purchasedOn: iso,
          createId: () => `preview-${seq++}`,
        });
        previewHtml = `<p class="field-sublabel">${escapeHtml(t.willCreate)}: ${tasks.length}</p>${tasks
          .map(
            (task) => `<div class="preview-touch cat-${task.category}">
                <span class="task-cat-chip">${escapeHtml(t.category[task.category] ?? task.category)}</span>
                <p class="task-card-meta">${escapeHtml(formatLocaleDate(task.touchOn, me.language))}</p>
                <p class="task-card-title">${escapeHtml(taskDisplayTitle(t, task.type, task.title))}</p>
              </div>`,
          )
          .join("")}`;
      } catch {
        previewHtml = `<p class="error">${escapeHtml(t.checkDate)}</p>`;
      }
    }

    const head = `
      <button type="button" class="link-back" id="pur-back">← ${escapeHtml(client.name)}</button>
      <p class="form-title">${escapeHtml(t.newPurchase)}</p>`;

    const body = `
      <p class="error" id="pur-error" hidden></p>
      <button type="button" class="row-nav" id="pick-product">
        <strong>${escapeHtml(t.productLabel)}</strong>
        <span>${productId ? escapeHtml(`${productName} · ${t.durationDays(durationDays)}`) : escapeHtml(t.chooseProduct)}</span>
      </button>
      <label class="field-label">${escapeHtml(t.purchaseDate)}
        <input type="date" id="pur-date" value="${escapeAttr(purchasedOn)}" />
      </label>
      ${previewHtml}`;

    const dock = `<button type="button" class="primary" id="pur-save">${escapeHtml(t.recordPurchaseAction)}</button>`;

    setScreenChrome(screen, "split");
    screen.innerHTML = splitLayout(head, body, dock);

    screen.querySelector("#pur-back")!.addEventListener("click", onBack);
    screen.querySelector("#pick-product")!.addEventListener("click", () => {
      void (async () => {
        const picked = await openCatalogPicker("product", t, me, {
          selectedId: productId,
          title: t.productLabel,
        });
        if (!picked.ok || !picked.id) return;
        const products = await listProducts();
        const p = products.find((x) => x.id === picked.id);
        if (!p) return;
        productId = p.id;
        productName = p.name;
        durationDays = p.durationDays;
        syncDraft();
        draw();
      })();
    });

    const dateInput = screen.querySelector("#pur-date") as HTMLInputElement;
    dateInput.onchange = () => {
      purchasedOn = dateInput.value;
      syncDraft();
      draw();
    };

    screen.querySelector("#pur-save")!.addEventListener("click", () => {
      void (async () => {
        const err = screen.querySelector("#pur-error") as HTMLElement;
        err.hidden = true;
        if (!productId) {
          err.textContent = t.chooseProduct;
          err.hidden = false;
          return;
        }
        try {
          await recordPurchaseForClient(clientId, productId, assertIsoDate(purchasedOn));
          await persistLocalChanges();
          onDraftChange(emptyPurchaseNewDraft());
          onBack();
        } catch (e) {
          err.textContent = userErrorMessage(e, t);
          err.hidden = false;
        }
      })();
    });
  };

  draw();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}