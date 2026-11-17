/** Маска +7 (999) 999-99-99 для отображения и хранения цифр. */
export function formatPhoneRuInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^8/, "7").slice(0, 11);
  const d = digits.startsWith("7") ? digits.slice(1) : digits;
  let out = "+7";
  if (d.length > 0) out += ` (${d.slice(0, 3)}`;
  if (d.length >= 3) out += `) ${d.slice(3, 6)}`;
  if (d.length >= 6) out += `-${d.slice(6, 8)}`;
  if (d.length >= 8) out += `-${d.slice(8, 10)}`;
  return out;
}

export function phoneDigitsForSave(masked: string): string {
  const digits = masked.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return masked.trim();
}

export function attachPhoneMask(input: HTMLInputElement): void {
  input.addEventListener("input", () => {
    const pos = input.selectionStart ?? input.value.length;
    input.value = formatPhoneRuInput(input.value);
    input.setSelectionRange(Math.min(pos + 1, input.value.length), Math.min(pos + 1, input.value.length));
  });
}