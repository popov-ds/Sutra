/** Ephemeral chat state (не переживает рестарт процесса). */

const promoAwait = new Set<number>();

export function setPromoAwait(userId: number, on: boolean): void {
  if (on) promoAwait.add(userId);
  else promoAwait.delete(userId);
}

export function isPromoAwait(userId: number): boolean {
  return promoAwait.has(userId);
}

export function clearPromoAwait(userId: number): void {
  promoAwait.delete(userId);
}

export type CloudDialog = "email" | "otp";

type CloudDraft = { step: CloudDialog; email: string };

const cloudDialog = new Map<number, CloudDraft>();

export function startCloudEmail(userId: number): void {
  cloudDialog.set(userId, { step: "email", email: "" });
  clearPromoAwait(userId);
}

export function startCloudOtp(userId: number, email: string): void {
  cloudDialog.set(userId, { step: "otp", email });
}

export function getCloudDialog(userId: number): CloudDraft | null {
  return cloudDialog.get(userId) ?? null;
}

export function clearCloudDialog(userId: number): void {
  cloudDialog.delete(userId);
}

export function isCloudDialog(userId: number): boolean {
  return cloudDialog.has(userId);
}