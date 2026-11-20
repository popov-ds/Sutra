import type { UiStrings } from "../i18n.js";

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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}