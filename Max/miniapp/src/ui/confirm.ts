import type { UiStrings } from "../i18n.js";
import { userErrorMessage } from "../i18n.js";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

function appHost(): HTMLElement {
  return document.getElementById("app") ?? document.body;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Диалог внутри #app — заголовок и размер как у Mini App (не нативный confirm). */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = appHost();
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "confirm-title");

    const finish = (ok: boolean) => {
      overlay.remove();
      resolve(ok);
    };

    overlay.innerHTML = `
      <div class="confirm-panel">
        <h2 class="confirm-title" id="confirm-title">${escapeHtml(options.title)}</h2>
        <p class="confirm-message">${escapeHtml(options.message)}</p>
        <p class="confirm-error" id="confirm-error" hidden></p>
        <div class="confirm-actions">
          <button type="button" class="btn-secondary" id="confirm-cancel">${escapeHtml(options.cancelLabel ?? "Отмена")}</button>
          <button type="button" class="${options.danger ? "btn-danger" : "primary"}" id="confirm-ok">${escapeHtml(options.confirmLabel ?? "ОК")}</button>
        </div>
      </div>`;

    overlay.querySelector("#confirm-cancel")!.addEventListener("click", () => finish(false));
    overlay.querySelector("#confirm-ok")!.addEventListener("click", () => finish(true));
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) finish(false);
    });

    host.appendChild(overlay);
  });
}

export function confirmDelete(t: UiStrings, message: string): Promise<boolean> {
  return confirmDialog({
    title: t.confirmTitle,
    message,
    confirmLabel: t.delete,
    cancelLabel: t.cancel,
    danger: true,
  });
}

/** Удаление с async-действием: ошибка (например «в использовании») — красным под текстом, диалог открыт. */
export function confirmDeleteWithAction(
  t: UiStrings,
  message: string,
  action: () => Promise<void>,
): Promise<boolean> {
  return new Promise((resolve) => {
    const host = appHost();
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const errorEl = document.createElement("p");
    errorEl.className = "confirm-error";
    errorEl.hidden = true;

    const finish = (ok: boolean) => {
      overlay.remove();
      resolve(ok);
    };

    overlay.innerHTML = `
      <div class="confirm-panel">
        <h2 class="confirm-title">${escapeHtml(t.confirmTitle)}</h2>
        <p class="confirm-message">${escapeHtml(message)}</p>
        <div class="confirm-actions">
          <button type="button" class="btn-secondary" id="confirm-cancel">${escapeHtml(t.cancel)}</button>
          <button type="button" class="btn-danger" id="confirm-ok">${escapeHtml(t.delete)}</button>
        </div>
      </div>`;

    const panel = overlay.querySelector(".confirm-panel")!;
    const actions = panel.querySelector(".confirm-actions")!;
    panel.insertBefore(errorEl, actions);

    const okBtn = overlay.querySelector("#confirm-ok") as HTMLButtonElement;
    const cancelBtn = overlay.querySelector("#confirm-cancel")!;

    cancelBtn.addEventListener("click", () => finish(false));
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) finish(false);
    });

    okBtn.addEventListener("click", () => {
      void (async () => {
        errorEl.hidden = true;
        okBtn.disabled = true;
        try {
          await action();
          finish(true);
        } catch (e) {
          errorEl.textContent = userErrorMessage(e, t);
          errorEl.hidden = false;
        } finally {
          okBtn.disabled = false;
        }
      })();
    });

    host.appendChild(overlay);
  });
}