declare global {
  interface Window {
    WebApp?: {
      initData?: string;
      ready?: () => void;
      expand?: () => void;
    };
  }
}

const LAUNCH_KEY = "sutra_max_launch";

export function initMaxWebApp(): void {
  window.WebApp?.ready?.();
  window.WebApp?.expand?.();
}

function initDataFromHash(): string {
  const hash = location.hash.replace(/^#/, "");
  if (!hash) return "";
  const params = new URLSearchParams(hash);
  return (params.get("WebAppData") ?? "").trim();
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
  return window.WebApp?.initData?.trim() || initDataFromHash();
}

/** Ждём initData от MAX Bridge (как Telegram WebApp). */
export async function resolveMaxAuth(): Promise<{ initData: string; launch: string }> {
  const launch = launchFromUrl();
  let initData = readBridgeInitData();
  if (initData) return { initData, launch };

  initMaxWebApp();
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 100));
    initData = readBridgeInitData();
    if (initData) return { initData, launch };
  }
  return { initData: "", launch };
}