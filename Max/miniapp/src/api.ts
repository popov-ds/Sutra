import { resolveMaxAuth } from "./maxBridge.js";

export type MeResponse = {
  maxUserId: number;
  tier: "free" | "pro";
  freeRecordLimit: number;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
};

export async function fetchMe(): Promise<MeResponse> {
  const { initData, launch } = await resolveMaxAuth();
  const headers: Record<string, string> = {};
  if (initData) headers["X-Max-Init-Data"] = initData;

  const params = new URLSearchParams();
  if (launch) params.set("launch", launch);
  if (initData && initData.length < 1200) params.set("initData", initData);

  const q = params.toString();
  const res = await fetch(`/api/me${q ? `?${q}` : ""}`, { headers, credentials: "same-origin" });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error === "missing or invalid auth"
      ? "Откройте приложение из чата с ботом MAX"
      : "Не удалось получить тариф");
  }
  return res.json() as Promise<MeResponse>;
}