import { CLIENT_STATUSES, type ClientStatus } from "../domain/validate.js";
import type { UiStrings } from "../i18n.js";

export function statusChipsHtml(selected: ClientStatus, t: UiStrings, inputName = "status"): string {
  const chips = CLIENT_STATUSES.map((status) => {
    const on = status === selected;
    return `<button type="button" class="status-chip ${on ? "status-chip--on" : ""}" data-status-chip="${status}" aria-pressed="${on}">${escapeHtml(t.statusLabel[status])}</button>`;
  }).join("");
  return `<input type="hidden" name="${escapeAttr(inputName)}" id="status-hidden" value="${escapeAttr(selected)}" />
  <p class="field-sublabel">${escapeHtml(t.funnel)}</p>
  <div class="status-chips" role="group" aria-label="${escapeAttr(t.funnel)}">${chips}</div>
  <p class="muted field-hint">${escapeHtml(t.funnelHint)}</p>`;
}

export function wireStatusChips(
  root: HTMLElement,
  onChange: (status: ClientStatus) => void,
  hiddenInput?: HTMLInputElement | null,
): void {
  root.querySelectorAll("[data-status-chip]").forEach((el) => {
    el.addEventListener("click", () => {
      const status = (el as HTMLElement).dataset.statusChip as ClientStatus;
      root.querySelectorAll("[data-status-chip]").forEach((chip) => {
        const on = (chip as HTMLElement).dataset.statusChip === status;
        chip.classList.toggle("status-chip--on", on);
        chip.setAttribute("aria-pressed", String(on));
      });
      if (hiddenInput) hiddenInput.value = status;
      onChange(status);
    });
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}