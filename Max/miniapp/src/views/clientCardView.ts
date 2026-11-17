import type { MeResponse } from "../api.js";
import {
  deletePurchaseRecord,
  listClientRequests,
  loadClientCard,
  persistDb,
  updateClientProfile,
  updateClientStatus,
  type ClientCard,
} from "../db/localDb.js";
import { formatRuDate as fmtRu, todayIso } from "../domain/dates.js";
import { DomainError } from "../domain/validate.js";
import type { UiStrings } from "../i18n.js";
import { openCatalogPicker } from "../ui/catalogModal.js";
import { confirmDelete } from "../ui/confirm.js";
import { listRowDeleteIcon } from "../ui/listScreen.js";
import { attachPhoneMask, formatPhoneRuInput, phoneDigitsForSave } from "../ui/phoneMask.js";
import { setScreenChrome, splitLayout } from "../ui/screenChrome.js";
import { statusChipsHtml, wireStatusChips } from "../ui/statusChips.js";
import { taskCardHtml } from "../ui/taskCard.js";

export async function renderClientCard(
  screen: HTMLElement,
  me: MeResponse,
  t: UiStrings,
  clientId: string,
  onBack: () => void,
  onPurchaseNew: () => void,
  onRefresh: () => void,
): Promise<void> {
  const card = await loadClientCard(clientId);
  if (!card) {
    setScreenChrome(screen, "scroll");
    screen.innerHTML = `<p class="muted">Клиент не найден</p>`;
    return;
  }

  const requests = await listClientRequests();
  const requestLabel =
    card.client.clientRequestId != null
      ? requests.find((r) => r.id === card.client.clientRequestId)?.name ?? t.chooseClientRequest
      : t.chooseClientRequest;

  const today = todayIso();
  const timeline = card.tasks.map((task) => taskCardHtml(task, today, t, { showComplete: false })).join("");

  const head = `
    <button type="button" class="link-back" id="card-back">← ${escapeHtml(t.clients)}</button>
    <p class="form-title">${escapeHtml(card.client.name)}</p>`;

  const body = `
    <p class="notice" id="card-notice" hidden></p>
    <p class="error" id="card-error" hidden></p>
    <label class="field-label">${escapeHtml(t.name)}<input id="c-name" value="${escapeAttr(card.client.name)}" placeholder="Имя" class="input--placeholder-muted" /></label>
    <label class="field-label">${escapeHtml(t.phone)}
      <input id="c-phone" value="${escapeAttr(formatPhoneRuInput(card.client.phone))}" inputmode="tel" placeholder="+7 (999) 999-99-99" class="input--placeholder-muted" />
    </label>
    <button type="button" class="link-action" id="c-call" ${card.client.phone ? "" : "hidden"}>${escapeHtml(t.call)}</button>
    <button type="button" class="row-nav" id="c-request">
      <strong>${escapeHtml(t.clientRequestLabel)}</strong>
      <span id="c-request-label">${escapeHtml(requestLabel)}</span>
    </button>
    <label class="field-label">${escapeHtml(t.additionalInfo)}
      <textarea id="c-notes" rows="3" placeholder="Заметки" class="input--placeholder-muted">${escapeHtml(card.client.additionalInfo)}</textarea>
    </label>
    <div class="block-funnel">${statusChipsHtml(card.client.status, t)}</div>
    <h2 class="section-title">${escapeHtml(t.purchases)}</h2>
    ${purchasesHtml(card, t)}
    <h2 class="section-title">${escapeHtml(t.timeline)}</h2>
    ${timeline || `<p class="muted">${escapeHtml(t.emptyTimeline)}</p>`}`;

  const dock = `
    <button type="button" class="primary" id="c-save">${escapeHtml(t.save)}</button>
    <button type="button" class="btn-secondary" id="c-purchase-new">${escapeHtml(t.recordPurchase)}</button>`;

  setScreenChrome(screen, "split");
  screen.innerHTML = splitLayout(head, body, dock);

  const phoneInput = screen.querySelector("#c-phone") as HTMLInputElement;
  attachPhoneMask(phoneInput);
  const notice = screen.querySelector("#card-notice") as HTMLElement;
  const err = screen.querySelector("#card-error") as HTMLElement;

  screen.querySelector("#card-back")!.addEventListener("click", onBack);
  screen.querySelector("#c-purchase-new")!.addEventListener("click", onPurchaseNew);

  const callBtn = screen.querySelector("#c-call");
  callBtn?.addEventListener("click", () => {
    const tel = phoneDigitsForSave(phoneInput.value).replace(/[^\d+]/g, "");
    if (tel) window.location.href = `tel:${tel}`;
  });

  screen.querySelector("#c-request")!.addEventListener("click", () => {
    void (async () => {
      const picked = await openCatalogPicker("clientRequest", t, me, {
        selectedId: card.client.clientRequestId,
        allowClear: true,
        title: t.clientRequestLabel,
      });
      if (!picked.ok) return;
      card.client.clientRequestId = picked.id;
      const label = screen.querySelector("#c-request-label");
      if (label) {
        label.textContent =
          picked.id == null
            ? t.chooseClientRequest
            : (await listClientRequests()).find((r) => r.id === picked.id)?.name ?? t.chooseClientRequest;
      }
      await updateClientProfile(clientId, {
        name: (screen.querySelector("#c-name") as HTMLInputElement).value,
        phone: phoneDigitsForSave(phoneInput.value),
        clientRequestId: picked.id,
        additionalInfo: (screen.querySelector("#c-notes") as HTMLTextAreaElement).value,
      });
      await persistDb();
    })();
  });

  wireStatusChips(screen, (status) => {
    void (async () => {
      notice.hidden = true;
      err.hidden = true;
      try {
        const result = await updateClientStatus(clientId, status);
        if (result.partnershipTask) {
          notice.textContent = t.partnershipScheduled(fmtRu(result.partnershipTask.touchOn));
          notice.hidden = false;
        }
        await persistDb();
        onRefresh();
      } catch (e) {
        err.textContent = e instanceof DomainError ? e.message : t.statusFailed;
        err.hidden = false;
      }
    })();
  });

  screen.querySelector("#c-save")!.addEventListener("click", () => {
    void (async () => {
      err.hidden = true;
      notice.hidden = true;
      try {
        await updateClientProfile(clientId, {
          name: (screen.querySelector("#c-name") as HTMLInputElement).value,
          phone: phoneDigitsForSave(phoneInput.value),
          clientRequestId: card.client.clientRequestId,
          additionalInfo: (screen.querySelector("#c-notes") as HTMLTextAreaElement).value,
        });
        await persistDb();
        notice.textContent = t.profileSaved;
        notice.hidden = false;
        const title = screen.querySelector(".screen-split-head .form-title");
        if (title) {
          title.textContent = (screen.querySelector("#c-name") as HTMLInputElement).value.trim();
        }
      } catch (e) {
        err.textContent = e instanceof DomainError ? e.message : t.saveFailed;
        err.hidden = false;
      }
    })();
  });

  screen.querySelectorAll("[data-purchase-del]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = (el as HTMLElement).dataset.purchaseDel!;
      const name = (el as HTMLElement).dataset.purchaseName ?? "";
      void (async () => {
        if (!(await confirmDelete(t.deletePurchaseConfirm(name)))) return;
        await deletePurchaseRecord(id);
        await persistDb();
        onRefresh();
      })();
    });
  });
}

function purchasesHtml(card: ClientCard, t: UiStrings): string {
  if (card.purchases.length === 0) {
    return `<p class="muted">${escapeHtml(t.noPurchases)}</p>`;
  }
  return card.purchases
    .map(
      (p) => `<div class="list-row card purchase-row">
        <div class="list-row-main">
          <strong>${escapeHtml(p.productName)}</strong>
          <p class="muted">${escapeHtml(t.purchasedOn(fmtRu(p.purchasedOn), fmtRu(p.courseEndsOn)))}</p>
        </div>
        <button type="button" class="list-row-delete" data-purchase-del="${escapeAttr(p.id)}" data-purchase-name="${escapeAttr(p.productName)}" aria-label="${escapeAttr(t.deletePurchase)}">${listRowDeleteIcon()}</button>
      </div>`,
    )
    .join("");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}