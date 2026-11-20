/** Поля, где нельзя перерисовывать весь экран — иначе в MAX WebView падает клавиатура. */
export function isTextFieldFocused(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
  const type = el.type.toLowerCase();
  if (type === "checkbox" || type === "radio" || type === "button" || type === "submit" || type === "file") {
    return false;
  }
  return true;
}

let pendingRun: (() => void) | null = null;
let blurListener = false;

export function deferRenderUntilBlur(run: () => void): boolean {
  if (!isTextFieldFocused()) return false;
  pendingRun = run;
  if (!blurListener) {
    blurListener = true;
    document.addEventListener(
      "focusout",
      () => {
        window.setTimeout(() => {
          if (!pendingRun || isTextFieldFocused()) return;
          const fn = pendingRun;
          pendingRun = null;
          fn();
        }, 50);
      },
      true,
    );
  }
  return true;
}