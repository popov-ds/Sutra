import { countClients } from "./db/localDb.js";
import { resolveMaxAuth } from "./maxBridge.js";

/** Сообщаем серверу число клиентов (для «Синхронизировать» в чате бота). */
export async function reportLocalClientCount(): Promise<void> {
  try {
    const clients = await countClients();
    const { initData, launch } = await resolveMaxAuth();
    if (!initData && !launch) return;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (initData) headers["X-Max-Init-Data"] = initData;

    const params = new URLSearchParams();
    if (launch) params.set("launch", launch);
    const q = params.toString();

    await fetch(`/api/local-stats${q ? `?${q}` : ""}`, {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: JSON.stringify({ clients }),
    });
  } catch {
    /* не мешаем CRM */
  }
}