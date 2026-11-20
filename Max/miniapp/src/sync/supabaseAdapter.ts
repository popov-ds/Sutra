import type { SupabaseClient } from "@supabase/supabase-js";
import type { RemoteChange, RemoteRecord, SyncEntity } from "./syncTypes.js";
import { SYNC_ENTITIES } from "./syncTypes.js";

const ISO_EPOCH = "1970-01-01T00:00:00.000Z";

export function dedupeRowsForPush(entity: SyncEntity, rows: RemoteRecord[]): RemoteRecord[] {
  const byId = new Map<string, RemoteRecord>();
  for (const row of rows) {
    byId.set(row.id, row);
  }
  let deduped = [...byId.values()];
  if (entity === "tasks") {
    const byDedupeKey = new Map<string, RemoteRecord>();
    for (const row of deduped) {
      const dedupeKey = String(row.dedupe_key);
      const prev = byDedupeKey.get(dedupeKey);
      if (!prev || String(row.updated_at) >= String(prev.updated_at)) {
        byDedupeKey.set(dedupeKey, row);
      }
    }
    deduped = [...byDedupeKey.values()];
  }
  return deduped;
}

export async function pullFromSupabase(
  client: SupabaseClient,
  userId: string,
  cursor: string | null,
): Promise<{ cursor: string; changes: RemoteChange[] }> {
  const since = cursor ?? ISO_EPOCH;
  const changes: RemoteChange[] = [];
  let newest = since;

  for (const entity of SYNC_ENTITIES) {
    const { data, error } = await client
      .from(entity)
      .select("*")
      .eq("user_id", userId)
      .gt("updated_at", since)
      .order("updated_at", { ascending: true });

    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      const updatedAt = String(row.updated_at);
      if (updatedAt > newest) newest = updatedAt;
      const deletedAt = row.deleted_at;
      changes.push({
        entity,
        entityId: String(row.id),
        op: deletedAt ? "delete" : "upsert",
        payload: row,
        updatedAt,
      });
    }
  }

  return { cursor: newest, changes };
}