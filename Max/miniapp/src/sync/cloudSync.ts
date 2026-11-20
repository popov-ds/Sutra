import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "sql.js";
import { emitDataChanged } from "../data/events.js";
import { getLocalDb, persistDb } from "../db/localDb.js";
import { applyRemoteChanges, loadLocalRowsForPush } from "./cloudApply.js";
import { dedupeRowsForPush, pullFromSupabase } from "./supabaseAdapter.js";
import { SYNC_ENTITIES, type RemoteRecord, type SyncEntity } from "./syncTypes.js";

const CURSOR_KEY = "sync_cursor";

let client: SupabaseClient | null = null;

export function getSupabase(url: string, anonKey: string): SupabaseClient {
  if (!client) client = createClient(url, anonKey);
  return client;
}

export async function sendEmailOtp(supabase: SupabaseClient, email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function verifyEmailOtp(supabase: SupabaseClient, email: string, code: string) {
  const result = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (result.error) throw result.error;
  return result;
}

export type CloudSyncResult = {
  clients: number;
  pushed: number;
  pulled: number;
};

function loadSyncCursor(db: Database): string | null {
  const stmt = db.prepare("SELECT value FROM meta WHERE key = ?");
  stmt.bind([CURSOR_KEY]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject() as { value: string };
  stmt.free();
  return row.value ?? null;
}

function saveSyncCursor(db: Database, cursor: string): void {
  db.run(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [CURSOR_KEY, cursor],
  );
}

function mapRowForPush(entity: SyncEntity, row: Record<string, unknown>, userId: string): RemoteRecord {
  const base: RemoteRecord = {
    ...row,
    id: String(row.id),
    user_id: userId,
    updated_at: String(row.updated_at),
    deleted_at: row.deleted_at == null ? null : String(row.deleted_at),
  };
  if (entity === "products" && base.duration_days != null) {
    base.duration_days = Number(base.duration_days);
  }
  return base;
}

async function pushAllLocal(
  supabase: SupabaseClient,
  userId: string,
  db: Database,
): Promise<number> {
  let pushed = 0;

  for (const entity of SYNC_ENTITIES) {
    const rows = loadLocalRowsForPush(db, entity);
    const upserts: RemoteRecord[] = [];

    for (const row of rows) {
      const record = mapRowForPush(entity, row, userId);
      if (record.deleted_at) {
        const { error } = await supabase
          .from(entity)
          .update({ deleted_at: record.deleted_at, updated_at: record.updated_at })
          .eq("user_id", userId)
          .eq("id", record.id);
        if (error) throw new Error(error.message);
        pushed++;
      } else {
        upserts.push(record);
      }
    }

    if (upserts.length === 0) continue;
    const batch = dedupeRowsForPush(entity, upserts);
    const { error } = await supabase.from(entity).upsert(batch, { onConflict: "user_id,id" });
    if (error) throw new Error(error.message);
    pushed += batch.length;
  }

  return pushed;
}

export async function runCloudSync(supabase: SupabaseClient): Promise<CloudSyncResult> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("supabase_no_session");

  const userId = data.session.user.id;
  const db = await getLocalDb();
  const cursor = loadSyncCursor(db);

  const pushed = await pushAllLocal(supabase, userId, db);

  const pulled = await pullFromSupabase(supabase, userId, cursor);
  let applied = 0;
  if (pulled.changes.length > 0) {
    applied = applyRemoteChanges(db, pulled.changes);
    if (pulled.cursor) saveSyncCursor(db, pulled.cursor);
    await persistDb();
  } else if (pulled.cursor && pulled.cursor !== (cursor ?? "")) {
    saveSyncCursor(db, pulled.cursor);
    await persistDb();
  }

  const row = db.exec(`SELECT COUNT(*) AS c FROM clients WHERE deleted_at IS NULL`)[0]?.values[0]?.[0];
  const clients = typeof row === "number" ? row : Number(row ?? 0);

  if (pushed > 0 || applied > 0) emitDataChanged();

  return { clients, pushed, pulled: applied };
}