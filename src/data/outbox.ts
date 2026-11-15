import type { SQLiteDatabase } from 'expo-sqlite';

import { createId } from '@/domain/ids';
import { nowIso } from '@/domain/dates';
import type { OutboxEntry } from '@/sync/adapter';

export async function insertOutbox(
  db: SQLiteDatabase,
  entry: Pick<OutboxEntry, 'entity' | 'entityId' | 'op' | 'payload'>,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_outbox (id, entity, entity_id, op, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    createId(),
    entry.entity,
    entry.entityId,
    entry.op,
    JSON.stringify(entry.payload),
    nowIso(),
  );
}
