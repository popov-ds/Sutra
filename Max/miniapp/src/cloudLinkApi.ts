import { resolveMaxAuth } from "./maxBridge.js";

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/** Связать Supabase user id с MAX-аккаунтом для утреннего дайджеста в чате. */
export async function registerCloudLink(link: {
  supabaseUserId: string | null;
  cloudEmail?: string | null;
}): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { initData, launch } = await resolveMaxAuth();
    if (!initData && !launch) {
      await sleep(150);
      continue;
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (initData) headers["X-Max-Init-Data"] = initData;
    const params = new URLSearchParams();
    if (launch) params.set("launch", launch);
    const q = params.toString();
    const res = await fetch(`/api/me/cloud${q ? `?${q}` : ""}`, {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: JSON.stringify(link),
    });
    if (res.status === 401) {
      await sleep(150);
      continue;
    }
    if (res.status === 403 || res.ok || res.status === 204) return;
    if (!res.ok) {
      console.warn("registerCloudLink:", res.status);
      return;
    }
    return;
  }
}