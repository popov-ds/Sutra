import type { MeResponse } from "../api.js";
import type { UiStrings } from "../i18n.js";
import { alertDialog } from "./alertDialog.js";
import { isProCloudSyncWarnDismissed, setProCloudSyncWarnDismissed } from "./proCloudSyncWarningPref.js";

export function needsProCloudSyncWarning(me: MeResponse, signedInEmail: string | null): boolean {
  return me.tier === "pro" && !signedInEmail;
}

export function updateCloudTabWarningStyle(me: MeResponse, signedInEmail: string | null): void {
  const cloudTab = document.querySelector<HTMLElement>('[data-primary="cloud"]');
  if (!cloudTab) return;
  const warn = needsProCloudSyncWarning(me, signedInEmail);
  cloudTab.classList.toggle("tab--cloud-warn", warn);
  cloudTab.toggleAttribute("aria-invalid", warn);
}

export async function showProCloudSyncWarningIfNeeded(t: UiStrings, me: MeResponse, signedInEmail: string | null): Promise<void> {
  if (!needsProCloudSyncWarning(me, signedInEmail)) return;
  if (isProCloudSyncWarnDismissed()) return;
  const { dontShowAgain } = await alertDialog({
    message: t.proCloudSyncWarning,
    closeLabel: t.cloudClose,
    dontShowAgainLabel: t.proCloudSyncWarnDontShowAgain,
  });
  if (dontShowAgain) setProCloudSyncWarnDismissed();
}