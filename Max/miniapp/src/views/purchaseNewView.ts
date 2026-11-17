import type { MeResponse } from "../api.js";
import { getClient, listProducts, persistDb, recordPurchaseForClient } from "../db/localDb.js";
import { buildPurchaseTasks } from "../domain/touchPlan.js";
import { assertIsoDate, formatRuDate, todayIso } from "../domain/dates.js";
import { DomainError } from "../domain/validate.js";
import type { UiStrings } from "../i18n.js";
import { openCatalogPicker } from "../ui/catalogModal.js";
import { setScreenChrome, splitLayout } from "../ui/screenChrome.js";

export async function renderPurchaseNew(
  screen: HTMLElement,
  me: MeResponse,
  t: UiStrings,
  clientId: string,
  onBack: () => void,
): Promise<void> {
  const client = await getClient(clientId);
  if (!client) {
    setScreenChrome(screen, "scroll");
    screen.innerHTML = `<p class="muted">Клиент не найден</p>`;
    return;
  }

  let productId: string | null = null;
  let productName = "";
  let durationDays = 30;
  let purchasedOn = todayIso();
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
                <p class="task-card-meta">${escapeHtml(formatRuDate(task.touchOn))}</p>
                <p class="task-card-title">${escapeHtml(task.title)}</p>
              </div>`,
          )
          .join("")}`;
      } catch {
        previewHtml = `<p class="error">Проверьте дату</p>`;
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
        draw();
      })();
    });

    const dateInput = screen.querySelector("#pur-date") as HTMLInputElement;
    dateInput.onchange = () => {
      purchasedOn = dateInput.value;
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
          await persistDb();
          onBack();
        } catch (e) {
          err.textContent = e instanceof DomainError ? e.message : String(e);
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