import { type AppLanguage, strings } from "./i18n.js";
import { resolveMaxAuth } from "./maxBridge.js";

export type MeResponse = {
  maxUserId: number;
  tier: "free" | "pro";
  language: AppLanguage;
  freeRecordLimit: number;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
};

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export async function fetchMe(stringsLang?: AppLanguage): Promise<MeResponse> {
  const guess: AppLanguage = stringsLang ?? (typeof navigator !== "undefined" && navigator.language.startsWith("en") ? "en" : "ru");
  let lastStatus = 0;
  for (let attempt = 0; attempt < 40; attempt++) {
    const { initData, launch } = await resolveMaxAuth();
    if (!initData && !launch) {
      await sleep(150);
      continue;
    }

    const headers: Record<string, string> = {};
    if (initData) headers["X-Max-Init-Data"] = initData;

    const params = new URLSearchParams();
    if (launch) params.set("launch", launch);
    if (initData && initData.length < 1200) params.set("initData", initData);

    const q = params.toString();
    const res = await fetch(`/api/me${q ? `?${q}` : ""}`, { headers, credentials: "same-origin" });
    lastStatus = res.status;
    if (res.ok) {
      const data = (await res.json()) as MeResponse;
      return { ...data, language: data.language === "en" ? "en" : "ru" };
    }
    if (res.status === 401) {
      await sleep(150);
      continue;
    }
    break;
  }

  const t = strings(guess);
  const err = lastStatus === 401 ? t.openFromMax : t.profileFailed;
  throw new Error(err);
}