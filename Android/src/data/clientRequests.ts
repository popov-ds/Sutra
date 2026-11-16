import type { SQLiteDatabase } from 'expo-sqlite';

import { prepareClientRequestInput } from '@/domain/clientRequest';
import { nowIso } from '@/domain/dates';
import { DomainError } from '@/domain/errors';
import { createId } from '@/domain/ids';
import type { ClientRequest } from '@/domain/types';
import { assertCanAddClientRequest } from '@/data/subscription';
import { enqueueWrite } from '@/db/queue';

import { emitDataChanged } from './events';
import { insertOutbox } from './outbox';
import type { ClientRequestRow } from './rows';

export function mapClientRequest(row: ClientRequestRow): ClientRequest {
  return { id: row.id, name: row.name };
}

export async function listClientRequests(db: SQLiteDatabase): Promise<ClientRequest[]> {
  return enqueueWrite(db, async () => {
    const rows = await db.getAllAsync<ClientRequestRow>(
      `SELECT id, name
       FROM client_requests
       WHERE deleted_at IS NULL
       ORDER BY name COLLATE NOCASE`,
    );
    return rows.map(mapClientRequest);
  });
}

export async function requireClientRequestUnlocked(db: SQLiteDatabase, requestId: string): Promise<ClientRequest> {
  const row = await db.getFirstAsync<ClientRequestRow>(
    `SELECT id, name FROM client_requests WHERE id = ? AND deleted_at IS NULL`,
    requestId,
  );
  if (!row) throw new DomainError('Запрос клиента не найден');
  return mapClientRequest(row);
}

export async function createClientRequest(db: SQLiteDatabase, name: string): Promise<ClientRequest> {
  const prepared = prepareClientRequestInput(name);
  const request = await enqueueWrite(db, async () => {
    await assertCanAddClientRequest(db);
    const timestamp = nowIso();
    const created: ClientRequest = { id: createId(), ...prepared };
    await db.runAsync(
      `INSERT INTO client_requests
        (id, name, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, 'pending')`,
      created.id,
      created.name,
      timestamp,
      timestamp,
    );
    await insertOutbox(db, {
      entity: 'client_requests',
      entityId: created.id,
      op: 'upsert',
      payload: { ...created, createdAt: timestamp, updatedAt: timestamp },
    });
    return created;
  });
  emitDataChanged();
  return request;
}

export async function updateClientRequest(db: SQLiteDatabase, requestId: string, name: string): Promise<ClientRequest> {
  const prepared = prepareClientRequestInput(name);
  const request = await enqueueWrite(db, async () => {
    await requireClientRequestUnlocked(db, requestId);
    const timestamp = nowIso();
    const updated: ClientRequest = { id: requestId, ...prepared };
    const result = await db.runAsync(
      `UPDATE client_requests
       SET name = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ? AND deleted_at IS NULL`,
      updated.name,
      timestamp,
      requestId,
    );
    if (result.changes === 0) throw new DomainError('Запрос клиента не найден');
    await insertOutbox(db, {
      entity: 'client_requests',
      entityId: requestId,
      op: 'upsert',
      payload: { ...updated, createdAt: timestamp, updatedAt: timestamp },
    });
    return updated;
  });
  emitDataChanged();
  return request;
}

export async function deleteClientRequest(db: SQLiteDatabase, requestId: string): Promise<void> {
  await enqueueWrite(db, async () => {
    await requireClientRequestUnlocked(db, requestId);
    const usage = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM clients WHERE client_request_id = ? AND deleted_at IS NULL`,
      requestId,
    );
    if ((usage?.count ?? 0) > 0) {
      throw new DomainError('Нельзя удалить запрос, который выбран у клиентов');
    }
    const timestamp = nowIso();
    const result = await db.runAsync(
      `UPDATE client_requests SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL`,
      timestamp,
      timestamp,
      requestId,
    );
    if (result.changes === 0) throw new DomainError('Запрос клиента не найден');
    await insertOutbox(db, { entity: 'client_requests', entityId: requestId, op: 'delete', payload: { id: requestId } });
  });
  emitDataChanged();
}
