import { escapeHtml } from "./confirm.js";

function appHost(): HTMLElement {
  return document.getElementById("app") ?? document.body;
}

type AlertOptions = {
  message: string;
  closeLabel: string;
  dontShowAgainLabel?: string;
};

export type AlertDialogResult = {
  dontShowAgain: boolean;
};

/** Модальный диалог с одной кнопкой «Закрыть». */
export function alertDialog(options: AlertOptions): Promise<AlertDialogResult> {
  return new Promise((resolve) => {
    const host = appHost();
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const withDontShow = Boolean(options.dontShowAgainLabel);
    let dontShowAgain = false;

    const finish = () => {
      overlay.remove();
      resolve({ dontShowAgain: withDontShow && dontShowAgain });
    };

    const dontShowBlock = withDontShow
      ? `<label class="alert-dont-show">
          <input type="checkbox" class="alert-dont-show-input" />
          <span>${escapeHtml(options.dontShowAgainLabel!)}</span>
        </label>`
      : "";

    overlay.innerHTML = `
      <div class="confirm-panel confirm-panel--alert">
        <p class="confirm-message confirm-message--warn">${escapeHtml(options.message)}</p>
        ${dontShowBlock}
        <div class="confirm-actions confirm-actions--single">
          <button type="button" class="primary" id="alert-close">${escapeHtml(options.closeLabel)}</button>
        </div>
      </div>`;

    if (withDontShow) {
      const input = overlay.querySelector<HTMLInputElement>(".alert-dont-show-input");
      input?.addEventListener("change", () => {
        dontShowAgain = input.checked;
      });
    }

    overlay.querySelector("#alert-close")!.addEventListener("click", finish);
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) finish();
    });

    host.appendChild(overlay);
  });
}