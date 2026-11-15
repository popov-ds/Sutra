import type { SQLiteDatabase } from 'expo-sqlite';

import { nowIso } from '@/domain/dates';
import { DomainError } from '@/domain/errors';
import type { OutboxEntry } from '@/sync/adapter';

/** Pull/apply order: parents before children (SQLite enforces FKs). */
export const SYNC_ENTITIES = ['client_requests', 'products', 'clients', 'purchases', 'tasks'] as const;

export type SyncEntity = (typeof SYNC_ENTITIES)[number];

const APPLY_ORDER: Record<SyncEntity, number> = {
  client_requests: 0,
  products: 1,
  clients: 2,
  purchases: 3,
  tasks: 4,
};

export function sortRemoteChangesForApply<T extends { entity: SyncEntity; updatedAt: string }>(changes: T[]): T[] {
  return [...changes].sort((a, b) => {
    const byEntity = APPLY_ORDER[a.entity] - APPLY_ORDER[b.entity];
    if (byEntity !== 0) return byEntity;
    return a.updatedAt.localeCompare(b.updatedAt);
  });
}

export type RemoteRecord = {
  user_id: string;
  id: string;
  updated_at: string;
  deleted_at: string | null;
  [key: string]: unknown;
};

type OutboxRow = {
  id: string;
  entity: string;
  entity_id: string;
  op: 'upsert' | 'delete';
  payload: string;
  created_at: string;
};

export async function listOutboxEntries(db: SQLiteDatabase): Promise<OutboxEntry[]> {
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT id, entity, entity_id, op, payload, created_at FROM sync_outbox ORDER BY created_at`,
  );
  return rows.map((row) => ({
    id: row.id,
    entity: row.entity as OutboxEntry['entity'],
    entityId: row.entity_id,
    op: row.op,
    payload: JSON.parse(row.payload) as unknown,
    createdAt: row.created_at,
  }));
}

export async function hydrateForPush(db: SQLiteDatabase, entry: OutboxEntry): Promise<RemoteRecord | null> {
  const row = await loadLocalRow(db, entry.entity, entry.entityId);
  if (entry.op === 'delete') {
    const timestamp = row?.updated_at ? String(row.updated_at) : nowIso();
    const deletedAt = row?.deleted_at ? String(row.deleted_at) : nowIso();
    if (row) {
      return { ...row, updated_at: timestamp, deleted_at: deletedAt };
    }
    return {
      id: entry.entityId,
      user_id: '',
      updated_at: timestamp,
      deleted_at: deletedAt,
    };
  }
  if (!row) return null;
  return row;
}

async function loadLocalRow(
  db: SQLiteDatabase,
  entity: OutboxEntry['entity'],
  entityId: string,
): Promise<RemoteRecord | null> {
  switch (entity) {
    case 'clients': {
      const row = await db.getFirstAsync<Record<string, unknown>>(
        `SELECT id, name, phone, status, health_tags, family_notes, client_request_id, regular_since,
                created_at, updated_at, deleted_at
         FROM clients WHERE id = ?`,
        entityId,
      );
      return row ? mapTimestamps(row) : null;
    }
    case 'products': {
      const row = await db.getFirstAsync<Record<string, unknown>>(
        `SELECT id, name, duration_days, created_at, updated_at, deleted_at FROM products WHERE id = ?`,
        entityId,
      );
      return row ? mapTimestamps(row) : null;
    }
    case 'client_requests': {
      const row = await db.getFirstAsync<Record<string, unknown>>(
        `SELECT id, name, created_at, updated_at, deleted_at FROM client_requests WHERE id = ?`,
        entityId,
      );
      return row ? mapTimestamps(row) : null;
    }
    case 'purchases': {
      const row = await db.getFirstAsync<Record<string, unknown>>(
        `SELECT id, client_id, product_id, purchased_on, created_at, updated_at, deleted_at FROM purchases WHERE id = ?`,
        entityId,
      );
      return row ? mapTimestamps(row) : null;
    }
    case 'tasks': {
      const row = await db.getFirstAsync<Record<string, unknown>>(
        `SELECT id, client_id, purchase_id, touch_on, type, category, title, details, status, source, dedupe_key,
                created_at, updated_at, deleted_at
         FROM tasks WHERE id = ?`,
        entityId,
      );
      return row ? mapTimestamps(row) : null;
    }
    default:
      throw new DomainError(`Неизвестная сущность: ${String(entity)}`);
  }
}

function mapTimestamps(row: Record<string, unknown>): RemoteRecord {
  return {
    ...row,
    id: String(row.id),
    user_id: '',
    updated_at: String(row.updated_at),
    deleted_at: row.deleted_at == null ? null : String(row.deleted_at),
  };
}

export function isRemoteNewer(localUpdatedAt: string | undefined, remoteUpdatedAt: string): boolean {
  if (!localUpdatedAt) return true;
  return remoteUpdatedAt >= localUpdatedAt;
}
