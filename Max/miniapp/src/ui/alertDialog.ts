import { escapeHtml } from "./confirm.js";

function appHost(): HTMLElement {
  return document.getElementById("app") ?? document.body;
}

type AlertOptions = {
  message: string;
  closeLabel: string;
};

/** Модальный диалог с одной кнопкой «Закрыть». */
export function alertDialog(options: AlertOptions): Promise<void> {
  return new Promise((resolve) => {
    const host = appHost();
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const finish = () => {
      overlay.remove();
      resolve();
    };

    overlay.innerHTML = `
      <div class="confirm-panel confirm-panel--alert">
        <p class="confirm-message confirm-message--warn">${escapeHtml(options.message)}</p>
        <div class="confirm-actions confirm-actions--single">
          <button type="button" class="primary" id="alert-close">${escapeHtml(options.closeLabel)}</button>
        </div>
      </div>`;

    overlay.querySelector("#alert-close")!.addEventListener("click", finish);
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) finish();
    });

    host.appendChild(overlay);
  });
}