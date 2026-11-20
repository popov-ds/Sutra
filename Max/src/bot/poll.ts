import { getUpdates, type MaxUpdate } from "../max/client.js";
import { handleUpdate } from "./menu.js";

export async function runPolling(): Promise<void> {
  let marker: number | undefined;
  console.log("MAX long polling…");
  for (;;) {
    try {
      const page = await getUpdates(marker);
      for (const u of page.updates ?? []) {
        await handleUpdate(u).catch((err) => console.error("handleUpdate:", err));
      }
      if (page.marker !== undefined) marker = page.marker;
    } catch (err) {
      console.error("Polling error:", err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}