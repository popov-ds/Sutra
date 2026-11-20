declare global {
  interface Window {
    WebApp?: {
      initData?: string;
      initDataUnsafe?: { user?: { id?: number }; start_param?: string };
      ready?: () => void;
      expand?: () => void;
      close?: () => void;
      BackButton?: {
        show: () => void;
        hide: () => void;
        onClick: (cb: () => void) => void;
        offClick: (cb: () => void) => void;
        isVisible?: boolean;
      };
    };
  }
}

const LAUNCH_KEY = "sutra_max_launch";
let cloudBackHandler: (() => void) | null = null;

export function initMaxWebApp(): void {
  window.WebApp?.ready?.();
  window.WebApp?.expand?.();
}

/** Системная «Назад» в шапке MAX — закрыть диалог облака. */
export function bindCloudNativeBack(onClose: () => void): void {
  const bb = window.WebApp?.BackButton;
  if (!bb) return;
  if (cloudBackHandler) {
    try {
      bb.offClick(cloudBackHandler);
    } catch {
      /* ignore */
    }
  }
  cloudBackHandler = () => {
    onClose();
    closeMaxWebApp();
  };
  bb.show();
  bb.onClick(cloudBackHandler);
}

/** Закрыть Mini App (MAX Bridge: WebAppClose). */
export function closeMaxWebApp(): void {
  const w = window.WebApp;
  if (!w) return;
  try {
    if (typeof w.close === "function") {
      w.close();
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    w.BackButton?.hide?.();
  } catch {
    /* ignore */
  }
}

function initDataFromHash(): string {
  const hash = location.hash.replace(/^#/, "");
  if (!hash) return "";
  const params = new URLSearchParams(hash);
  const raw = params.get("WebAppData") ?? "";
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function initDataFromSearch(): string {
  return new URLSearchParams(location.search).get("initData")?.trim() ?? "";
}

function launchFromUrl(): string {
  const q = new URLSearchParams(location.search).get("launch")?.trim() ?? "";
  if (q) {
    sessionStorage.setItem(LAUNCH_KEY, q);
    return q;
  }
  return sessionStorage.getItem(LAUNCH_KEY) ?? "";
}

function readBridgeInitData(): string {
  const bridge = window.WebApp?.initData?.trim();
  if (bridge) return bridge;
  const fromHash = initDataFromHash();
  if (fromHash) return fromHash;
  return initDataFromSearch();
}

/** start_param из open_app (payload кнопки) или ?startapp=. */
export function readStartParam(): string | null {
  const fromUnsafe = window.WebApp?.initDataUnsafe?.start_param?.trim();
  if (fromUnsafe) return fromUnsafe;
  const initData = readBridgeInitData();
  if (initData) {
    const sp = new URLSearchParams(initData).get("start_param")?.trim();
    if (sp) return sp;
  }
  const q = new URLSearchParams(location.search).get("startapp")?.trim();
  return q || null;
}

/** Нужно показать облако (кнопка «Синхронизация» → open_app payload cloud). */
export async function shouldOpenCloudInApp(): Promise<boolean> {
  const route = new URLSearchParams(location.search).get("route")?.trim().toLowerCase();
  if (route === "cloud") return true;

  for (let i = 0; i < 24; i++) {
    const sp = readStartParam();
    if (sp === "cloud") return true;

    const initData = readBridgeInitData();
    if (initData) {
      const params = new URLSearchParams(initData);
      const fromData = params.get("start_param")?.trim();
      if (fromData === "cloud") return true;
      if (fromData && fromData !== "cloud") return false;
      if (i >= 3) return false;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

/** Страница открыта внутри MAX WebView (есть initData), а не во внешнем браузере по link. */
export function isOpenedInsideMax(): boolean {
  if (window.WebApp?.initData?.trim()) return true;
  if (initDataFromHash()) return true;
  return Boolean(initDataFromSearch());
}

/** initData и/или launch из MAX Bridge; ждём Bridge, если в URL уже есть launch. */
export async function resolveMaxAuth(): Promise<{ initData: string; launch: string }> {
  initMaxWebApp();
  for (let i = 0; i < 80; i++) {
    const launch = launchFromUrl();
    const initData = readBridgeInitData();
    if (initData || launch) return { initData, launch };
    await new Promise((r) => setTimeout(r, 125));
  }
  return { initData: readBridgeInitData(), launch: launchFromUrl() };
}