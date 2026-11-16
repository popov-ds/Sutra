import type { SupabaseClient } from '@supabase/supabase-js';

import { DomainError } from '@/domain/errors';
import type { RemoteChange } from '@/sync/adapter';
import { SYNC_ENTITIES, type RemoteRecord, type SyncEntity } from '@/sync/syncRecords';

const ISO_EPOCH = '1970-01-01T00:00:00.000Z';

/** Postgres rejects batched upserts when the same conflict key appears twice in one statement. */
export function dedupeRowsForPush(entity: SyncEntity, rows: RemoteRecord[]): RemoteRecord[] {
  const byId = new Map<string, RemoteRecord>();
  for (const row of rows) {
    byId.set(row.id, row);
  }
  let deduped = [...byId.values()];
  if (entity === 'tasks') {
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

export type PushPackage = {
  outboxId: string;
  entity: SyncEntity;
  op: 'upsert' | 'delete';
  record: RemoteRecord;
};

export async function pushToSupabase(
  client: SupabaseClient,
  userId: string,
  packages: PushPackage[],
): Promise<string[]> {
  if (packages.length === 0) return [];

  const outboxIds: string[] = [];
  const upserts = new Map<SyncEntity, RemoteRecord[]>();

  for (const pkg of packages) {
    outboxIds.push(pkg.outboxId);
    if (pkg.op === 'delete') {
      const deletedAt = pkg.record.deleted_at ?? pkg.record.updated_at;
      const updatedAt = pkg.record.updated_at;
      const { error } = await client
        .from(pkg.entity)
        .update({ deleted_at: deletedAt, updated_at: updatedAt })
        .eq('user_id', userId)
        .eq('id', pkg.record.id);
      if (error) throw new DomainError(error.message);
      continue;
    }
    const record = { ...pkg.record, user_id: userId };
    const bucket = upserts.get(pkg.entity) ?? [];
    bucket.push(record);
    upserts.set(pkg.entity, bucket);
  }

  for (const [entity, rows] of upserts) {
    const batch = dedupeRowsForPush(entity, rows);
    if (batch.length === 0) continue;
    const { error } = await client.from(entity).upsert(batch, { onConflict: 'user_id,id' });
    if (error) throw new DomainError(error.message);
  }

  return outboxIds;
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
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', since)
      .order('updated_at', { ascending: true });

    if (error) throw new DomainError(error.message);

    for (const row of data ?? []) {
      const updatedAt = String(row.updated_at);
      if (updatedAt > newest) newest = updatedAt;
      const deletedAt = row.deleted_at;
      changes.push({
        entity,
        entityId: String(row.id),
        op: deletedAt ? 'delete' : 'upsert',
        payload: row,
        updatedAt,
      });
    }
  }

  return { cursor: newest, changes };
}
