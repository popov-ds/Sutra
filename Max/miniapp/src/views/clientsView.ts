import type { MeResponse } from "../api.js";
import {
  createClientRecord,
  deleteClientRecord,
  listClients,
  persistLocalChanges,
} from "../db/localDb.js";
import { type ClientStatus } from "../domain/validate.js";
import type { UiStrings } from "../i18n.js";
import { userErrorMessage } from "../i18n.js";
import { confirmDelete } from "../ui/confirm.js";
import { listRowDeleteIcon, listScreenLayout, setListScreenMode } from "../ui/listScreen.js";
import { setScreenChrome, splitLayout } from "../ui/screenChrome.js";
import { attachPhoneMask, phoneDigitsForSave } from "../ui/phoneMask.js";
import { statusChipsHtml, wireStatusChips } from "../ui/statusChips.js";
import { renderClientCard } from "./clientCardView.js";
import { type PurchaseNewDraft, renderPurchaseNew } from "./purchaseNewView.js";

export type ClientsRoute =
  | "list"
  | "new"
  | { edit: string }
  | { purchaseNew: string };

export async function renderClientsView(
  screen: HTMLElement,
  me: MeResponse,
  t: UiStrings,
  route: ClientsRoute,
  query: string,
  onQuery: (q: string) => void,
  onRoute: (route: ClientsRoute) => void,
  onRefresh: () => void,
  purchaseDraftFor: (clientId: string) => PurchaseNewDraft,
  onPurchaseDraft: (clientId: string, draft: PurchaseNewDraft) => void,
): Promise<void> {
  screen.dataset.dirView = "";

  if (typeof route === "object" && "purchaseNew" in route) {
    const clientId = route.purchaseNew;
    const draft = purchaseDraftFor(clientId);
    await renderPurchaseNew(
      screen,
      me,
      t,
      clientId,
      draft,
      (next) => onPurchaseDraft(clientId, next),
      () => onRoute({ edit: clientId }),
    );
    return;
  }

  if (typeof route === "object" && "edit" in route) {
    await renderClientCard(
      screen,
      me,
      t,
      route.edit,
      () => onRoute("list"),
      () => onRoute({ purchaseNew: route.edit }),
      onRefresh,
    );
    return;
  }

  if (route === "new") {
    await renderNewClient(screen, me, t, onRoute);
    return;
  }

  setScreenChrome(screen, "list");

  const clients = await listClients();
  const needle = query.trim().toLocaleLowerCase("ru");
  const visible = needle
    ? clients.filter((c) =>
        [c.name, c.phone].join(" ").toLocaleLowerCase("ru").includes(needle),
      )
    : clients;

  const limit = me.tier === "free" ? me.freeRecordLimit : null;
  const sticky =
    `<p class="form-title screen-heading">${t.clients}</p>` +
    `<div class="toolbar"><button type="button" class="btn-secondary" id="client-add">+ ${escapeHtml(t.newClient)}</button></div>` +
    `<input type="search" class="search" placeholder="${escapeAttr(t.searchClients)}" value="${escapeAttr(query)}" id="client-search" autocomplete="off" />` +
    `<p class="muted list-meta">${t.clientsCount(clients.length, limit)}</p>`;

  const listBody =
    visible.length === 0
      ? `<p class="muted">${clients.length === 0 ? t.emptyClients : t.noSearchHits}</p>`
      : visible
          .map(
            (c) =>
              `<div class="list-row card">
                <button type="button" class="list-row-main" data-client-open="${escapeAttr(c.id)}">
                  <strong>${escapeHtml(c.name)}</strong>
                  ${c.phone ? `<p class="muted">${escapeHtml(c.phone)}</p>` : ""}
                  <span class="badge badge-muted">${escapeHtml(t.statusLabel[c.status as keyof typeof t.statusLabel] ?? c.status)}</span>
                </button>
                <button type="button" class="list-row-delete" data-client-del="${escapeAttr(c.id)}" aria-label="${escapeAttr(t.delete)}">${listRowDeleteIcon()}</button>
              </div>`,
          )
          .join("");

  setListScreenMode(screen, true);
  screen.innerHTML = listScreenLayout(sticky, listBody);

  document.getElementById("client-add")!.onclick = () => onRoute("new");
  const input = document.getElementById("client-search") as HTMLInputElement;
  input.oninput = () => onQuery(input.value);

  screen.querySelectorAll("[data-client-open]").forEach((el) => {
    el.addEventListener("click", () =>
      onRoute({ edit: (el as HTMLElement).dataset.clientOpen! }),
    );
  });
  screen.querySelectorAll("[data-client-del]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const id = (el as HTMLElement).dataset.clientDel!;
      const name = visible.find((c) => c.id === id)?.name ?? t.deleteFallbackClient;
      void (async () => {
        if (!(await confirmDelete(t, t.deleteClientNamed(name)))) return;
        await deleteClientRecord(id);
        await persistLocalChanges();
        onRefresh();
      })();
    });
  });
}

async function renderNewClient(
  screen: HTMLElement,
  me: MeResponse,
  t: UiStrings,
  onRoute: (route: ClientsRoute) => void,
): Promise<void> {
  let status: ClientStatus = "newbie";
  const head = `
    <button type="button" class="link-back" id="form-back">← ${escapeHtml(t.clients)}</button>
    <p class="form-title">${escapeHtml(t.newClient)}</p>`;
  const body = `
    <p class="error" id="form-error" hidden></p>
    <label class="field-label">${escapeHtml(t.name)}<input id="f-name" placeholder="${escapeAttr(t.namePlaceholder)}" class="input--placeholder-muted" /></label>
    <label class="field-label">${escapeHtml(t.phone)}<input id="f-phone" inputmode="tel" placeholder="+7 900 000-00-00" class="input--placeholder-muted" /></label>
  <div id="status-wrap">${statusChipsHtml(status, t)}</div>`;
  const dock = `<button type="button" class="primary" id="form-save">${escapeHtml(t.save)}</button>`;
  setScreenChrome(screen, "split");
  screen.innerHTML = splitLayout(head, body, dock);

  const phoneInput = screen.querySelector("#f-phone") as HTMLInputElement;
  attachPhoneMask(phoneInput);

  wireStatusChips(screen, (s) => {
    status = s;
  });

  screen.querySelector("#form-back")!.addEventListener("click", () => onRoute("list"));
  const errEl = screen.querySelector("#form-error")!;

  screen.querySelector("#form-save")!.addEventListener("click", () => {
    void (async () => {
      (errEl as HTMLElement).hidden = true;
      try {
        const id = await createClientRecord(
          {
            name: (screen.querySelector("#f-name") as HTMLInputElement).value,
            phone: phoneDigitsForSave(phoneInput.value),
            status,
          },
          me.tier === "pro",
          me.freeRecordLimit,
        );
        await persistLocalChanges();
        onRoute({ edit: id });
      } catch (e) {
        (errEl as HTMLElement).textContent = userErrorMessage(e, t);
        (errEl as HTMLElement).hidden = false;
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