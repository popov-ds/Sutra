import type { MeResponse } from "../api.js";
import { confirmDelete } from "./ui/confirm.js";
import {
  createClientRequestRecord,
  createProductRecord,
  deleteClientRequestRecord,
  deleteProductRecord,
  listClientRequests,
  listProducts,
  persistDb,
  updateClientRequestRecord,
  updateProductRecord,
} from "./db/localDb.js";
import { DomainError } from "./domain/validate.js";
import { listRowDeleteIcon, listScreenLayout, setListScreenMode } from "./ui/listScreen.js";

export type DirScreen =
  | "home"
  | "products"
  | "product-new"
  | { productEdit: string }
  | "client-requests"
  | "request-new"
  | { requestEdit: string };

export async function renderDirectories(
  screen: HTMLElement,
  me: MeResponse,
  view: DirScreen,
  onNavigate: (next: DirScreen) => void,
  onRefresh: () => void,
): Promise<void> {
  screen.dataset.dirView = serializeView(view);

  if (view === "home") {
    setListScreenMode(screen, false);
    screen.innerHTML = `
    <button type="button" class="directory-row card" data-dir-go="products">
      <span class="dir-icon-wrap"><span class="material-symbols-outlined" aria-hidden="true">inventory_2</span></span>
      <span class="dir-label">Продукты</span>
      <span class="material-symbols-outlined chevron" aria-hidden="true">chevron_right</span>
    </button>
    <button type="button" class="directory-row card" data-dir-go="client-requests">
      <span class="dir-icon-wrap"><span class="material-symbols-outlined" aria-hidden="true">help_outline</span></span>
      <span class="dir-label">Запросы клиентов</span>
      <span class="material-symbols-outlined chevron" aria-hidden="true">chevron_right</span>
    </button>
  `;
    screen.querySelectorAll("[data-dir-go]").forEach((el) => {
      el.addEventListener("click", () => onNavigate((el as HTMLElement).dataset.dirGo as "products" | "client-requests"));
    });
    return;
  }

  if (view === "products" || view === "product-new" || (typeof view === "object" && "productEdit" in view)) {
    await renderProductsBranch(screen, me, view, onNavigate, onRefresh);
    return;
  }

  await renderRequestsBranch(screen, me, view, onNavigate, onRefresh);
}

function serializeView(view: DirScreen): string {
  if (view === "home" || view === "products" || view === "product-new" || view === "client-requests" || view === "request-new") {
    return view;
  }
  if ("productEdit" in view) return `product:${view.productEdit}`;
  return `request:${view.requestEdit}`;
}

async function renderProductsBranch(
  screen: HTMLElement,
  me: MeResponse,
  view: DirScreen,
  onNavigate: (next: DirScreen) => void,
  onRefresh: () => void,
): Promise<void> {
  if (view === "product-new" || (typeof view === "object" && "productEdit" in view)) {
    setListScreenMode(screen, false);
    const isNew = view === "product-new";
    const id = isNew ? "" : view.productEdit;
    const product = isNew ? null : (await listProducts()).find((p) => p.id === id) ?? null;
    if (!isNew && !product) {
      screen.innerHTML = `<p class="muted">Продукт не найден</p>`;
      return;
    }
    screen.innerHTML = `
      <button type="button" class="link-back" id="dir-back">← Продукты</button>
      <p class="form-title">${isNew ? "Новый продукт" : "Редактирование"}</p>
      <p class="error" id="form-error" hidden></p>
      <label class="field-label">Название<input id="f-name" value="${escapeAttr(product?.name ?? "")}" placeholder="Название продукта" class="input--placeholder-muted" /></label>
      <label class="field-label">Срок курса (дней)<input id="f-days" type="number" min="1" value="${product?.durationDays ?? 30}" /></label>
      <div class="form-actions">
        <button type="button" class="primary" id="form-save">${isNew ? "Создать" : "Сохранить"}</button>
      </div>`;
    const err = document.getElementById("form-error")!;
    document.getElementById("dir-back")!.onclick = () => onNavigate("products");
    document.getElementById("form-save")!.onclick = () => {
      void (async () => {
        err.hidden = true;
        try {
          const name = (document.getElementById("f-name") as HTMLInputElement).value;
          const days = Number((document.getElementById("f-days") as HTMLInputElement).value);
          if (isNew) await createProductRecord(name, days, me.tier === "pro", me.freeRecordLimit);
          else await updateProductRecord(id, name, days);
          await persistDb();
          onNavigate("products");
        } catch (e) {
          err.textContent = e instanceof DomainError ? e.message : String(e);
          err.hidden = false;
        }
      })();
    };
    return;
  }

  const items = await listProducts();
  const sticky =
    `<button type="button" class="link-back" id="dir-back">← Справочники</button>` +
    `<div class="toolbar"><button type="button" class="btn-secondary" id="product-add">+ Добавить</button></div>`;

  const listBody =
    items.length === 0
      ? `<p class="muted">Нет продуктов.</p>`
      : items
          .map(
            (p) =>
              `<div class="list-row card">
                <button type="button" class="list-row-main list-row-main--dir" data-product-open="${escapeAttr(p.id)}">
                  <span class="dir-icon-wrap"><span class="material-symbols-outlined">inventory_2</span></span>
                  <div class="list-row-text"><strong>${escapeHtml(p.name)}</strong><br><span class="muted">Срок: ${p.durationDays} дн.</span></div>
                </button>
                <button type="button" class="list-row-delete" data-product-del="${escapeAttr(p.id)}" aria-label="Удалить">${listRowDeleteIcon()}</button>
              </div>`,
          )
          .join("");

  setListScreenMode(screen, true);
  screen.innerHTML = listScreenLayout(sticky, listBody);

  document.getElementById("dir-back")!.onclick = () => onNavigate("home");
  document.getElementById("product-add")!.onclick = () => onNavigate("product-new");
  screen.querySelectorAll("[data-product-open]").forEach((el) => {
    el.addEventListener("click", () => onNavigate({ productEdit: (el as HTMLElement).dataset.productOpen! }));
  });
  screen.querySelectorAll("[data-product-del]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const id = (el as HTMLElement).dataset.productDel!;
      const name = items.find((p) => p.id === id)?.name ?? "продукт";
      void (async () => {
        if (!(await confirmDelete(`Удалить «${name}»?`))) return;
        await deleteProductRecord(id);
        await persistDb();
        onRefresh();
      })();
    });
  });
}

async function renderRequestsBranch(
  screen: HTMLElement,
  me: MeResponse,
  view: DirScreen,
  onNavigate: (next: DirScreen) => void,
  onRefresh: () => void,
): Promise<void> {
  if (view === "request-new" || (typeof view === "object" && "requestEdit" in view)) {
    setListScreenMode(screen, false);
    const isNew = view === "request-new";
    const id = isNew ? "" : view.requestEdit;
    const item = isNew ? null : (await listClientRequests()).find((r) => r.id === id) ?? null;
    if (!isNew && !item) {
      screen.innerHTML = `<p class="muted">Запись не найдена</p>`;
      return;
    }
    screen.innerHTML = `
      <button type="button" class="link-back" id="dir-back">← Запросы</button>
      <p class="form-title">${isNew ? "Новый запрос" : "Редактирование"}</p>
      <p class="error" id="form-error" hidden></p>
      <label class="field-label">Название<input id="f-name" value="${escapeAttr(item?.name ?? "")}" placeholder="Название запроса" class="input--placeholder-muted" /></label>
      <div class="form-actions">
        <button type="button" class="primary" id="form-save">${isNew ? "Создать" : "Сохранить"}</button>
      </div>`;
    const err = document.getElementById("form-error")!;
    document.getElementById("dir-back")!.onclick = () => onNavigate("client-requests");
    document.getElementById("form-save")!.onclick = () => {
      void (async () => {
        err.hidden = true;
        try {
          const name = (document.getElementById("f-name") as HTMLInputElement).value;
          if (isNew) await createClientRequestRecord(name, me.tier === "pro", me.freeRecordLimit);
          else await updateClientRequestRecord(id, name);
          await persistDb();
          onNavigate("client-requests");
        } catch (e) {
          err.textContent = e instanceof DomainError ? e.message : String(e);
          err.hidden = false;
        }
      })();
    };
    return;
  }

  const items = await listClientRequests();
  const sticky =
    `<button type="button" class="link-back" id="dir-back">← Справочники</button>` +
    `<div class="toolbar"><button type="button" class="btn-secondary" id="request-add">+ Добавить</button></div>`;

  const listBody =
    items.length === 0
      ? `<p class="muted">Нет запросов клиентов.</p>`
      : items
          .map(
            (r) =>
              `<div class="list-row card">
                <button type="button" class="list-row-main list-row-main--dir" data-request-open="${escapeAttr(r.id)}">
                  <span class="dir-icon-wrap"><span class="material-symbols-outlined">help_outline</span></span>
                  <strong>${escapeHtml(r.name)}</strong>
                </button>
                <button type="button" class="list-row-delete" data-request-del="${escapeAttr(r.id)}" aria-label="Удалить">${listRowDeleteIcon()}</button>
              </div>`,
          )
          .join("");

  setListScreenMode(screen, true);
  screen.innerHTML = listScreenLayout(sticky, listBody);

  document.getElementById("dir-back")!.onclick = () => onNavigate("home");
  document.getElementById("request-add")!.onclick = () => onNavigate("request-new");
  screen.querySelectorAll("[data-request-open]").forEach((el) => {
    el.addEventListener("click", () => onNavigate({ requestEdit: (el as HTMLElement).dataset.requestOpen! }));
  });
  screen.querySelectorAll("[data-request-del]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const id = (el as HTMLElement).dataset.requestDel!;
      const name = items.find((r) => r.id === id)?.name ?? "запрос";
      void (async () => {
        if (!(await confirmDelete(`Удалить «${name}»?`))) return;
        try {
          await deleteClientRequestRecord(id);
          await persistDb();
          onRefresh();
        } catch (e) {
          alert(e instanceof DomainError ? e.message : String(e));
        }
      })();
    });
  });
}

export function dirViewToDataset(view: DirScreen): string {
  return serializeView(view);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}