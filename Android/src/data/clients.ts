import type { SQLiteDatabase } from 'expo-sqlite';

import { prepareClientInput, type ClientInput } from '@/domain/clientInput';
import { assertIsoDate, nowIso, todayIso } from '@/domain/dates';
import { DomainError } from '@/domain/errors';
import { createId } from '@/domain/ids';
import type { Client, ClientStatus, Purchase, TaskDraft, TaskListItem } from '@/domain/types';
import {
  buildPartnershipTask,
  shouldCancelPartnershipWindow,
  shouldSchedulePartnershipWindow,
} from '@/domain/touchPlan';
import { assertCanAddClient } from '@/data/subscription';
import { enqueueWrite } from '@/db/queue';

import { emitDataChanged } from './events';
import { mapClient, requireClientUnlocked, selectPurchasesUnlocked, selectTaskRows, TASK_SELECT } from './mappers';
import { insertOutbox } from './outbox';
import type { ClientRow } from './rows';
import { cancelOpenPartnershipTasksUnlocked, insertTaskDeduped, markOverdueUnlocked } from './tasks';

export type ClientCard = {
  client: Client;
  purchases: Purchase[];
  tasks: TaskListItem[];
};

export type StatusChange = {
  client: Client;
  partnershipTask: TaskDraft | null;
};

export async function listClients(db: SQLiteDatabase): Promise<Client[]> {
  return enqueueWrite(db, async () => {
    const rows = await db.getAllAsync<ClientRow>(
      `SELECT id, name, phone, status, health_tags, family_notes, client_request_id, regular_since, created_at, updated_at
       FROM clients
       WHERE deleted_at IS NULL
       ORDER BY name`,
    );
    return rows.map(mapClient);
  });
}

export async function loadClientCard(db: SQLiteDatabase, clientId: string): Promise<ClientCard> {
  const today = todayIso();
  return enqueueWrite(db, async () => {
    await markOverdueUnlocked(db, today);
    const client = await requireClientUnlocked(db, clientId);
    const purchases = await selectPurchasesUnlocked(db, clientId);
    const tasks = await selectTaskRows(
      db,
      `${TASK_SELECT} AND t.client_id = ? ORDER BY t.touch_on, t.title`,
      clientId,
    );
    return { client, purchases, tasks };
  });
}

export async function createClient(db: SQLiteDatabase, input: ClientInput): Promise<Client> {
  const prepared = prepareClientInput(input);
  const client = await enqueueWrite(db, async () => {
    await assertCanAddClient(db);
    return insertClient(db, prepared);
  });
  emitDataChanged();
  return client;
}

export type ClientProfileInput = {
  name: string;
  phone: string;
  clientRequestId: string | null;
  additionalInfo: string;
};

const ADDITIONAL_INFO_LIMIT = 4000;

export async function updateClientProfile(
  db: SQLiteDatabase,
  clientId: string,
  input: ClientProfileInput,
): Promise<Client> {
  const name = input.name.trim();
  if (!name) throw new DomainError('Укажите имя клиента');
  if (name.length > 120) throw new DomainError('Имя слишком длинное');
  const phone = input.phone.trim();
  if (phone.length > 40) throw new DomainError('Телефон слишком длинный');
  const additionalInfo = input.additionalInfo.trim();
  if (additionalInfo.length > ADDITIONAL_INFO_LIMIT) {
    throw new DomainError('Дополнительная информация слишком длинная');
  }
  const clientRequestId = input.clientRequestId;

  const client = await enqueueWrite(db, async () => {
    const current = await requireClientUnlocked(db, clientId);
    if (clientRequestId) {
      const row = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM client_requests WHERE id = ? AND deleted_at IS NULL`,
        clientRequestId,
      );
      if (!row) throw new DomainError('Запрос клиента не найден');
    }
    const timestamp = nowIso();
    const updated: Client = {
      ...current,
      name,
      phone,
      clientRequestId,
      additionalInfo,
      updatedAt: timestamp,
    };
    const result = await db.runAsync(
      `UPDATE clients
       SET name = ?, phone = ?, family_notes = ?, client_request_id = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ? AND deleted_at IS NULL`,
      updated.name,
      updated.phone,
      updated.additionalInfo,
      updated.clientRequestId,
      timestamp,
      clientId,
    );
    if (result.changes === 0) throw new DomainError('Клиент не найден');
    await insertOutbox(db, { entity: 'clients', entityId: clientId, op: 'upsert', payload: updated });
    return updated;
  });
  emitDataChanged();
  return client;
}

export async function deleteClient(db: SQLiteDatabase, clientId: string): Promise<void> {
  await enqueueWrite(db, async () => {
    await requireClientUnlocked(db, clientId);
    const timestamp = nowIso();
    await db.runAsync(
      `UPDATE tasks SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE client_id = ? AND deleted_at IS NULL`,
      timestamp,
      timestamp,
      clientId,
    );
    await db.runAsync(
      `UPDATE purchases SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE client_id = ? AND deleted_at IS NULL`,
      timestamp,
      timestamp,
      clientId,
    );
    const result = await db.runAsync(
      `UPDATE clients SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL`,
      timestamp,
      timestamp,
      clientId,
    );
    if (result.changes === 0) throw new DomainError('Клиент не найден');
    await insertOutbox(db, { entity: 'clients', entityId: clientId, op: 'delete', payload: { id: clientId } });
  });
  emitDataChanged();
}

export async function updateClientStatus(
  db: SQLiteDatabase,
  clientId: string,
  next: ClientStatus,
  changedOn = todayIso(),
): Promise<StatusChange> {
  const change = await enqueueWrite(db, async () => {
    const current = await requireClientUnlocked(db, clientId);
    if (current.status === next) return { client: current, partnershipTask: null, changed: false };

    const timestamp = nowIso();
    const statusChangedOn = assertIsoDate(changedOn);
    let partnershipTask: TaskDraft | null = null;
    let regularSince = current.regularSince;
    if (shouldCancelPartnershipWindow(current.status, next)) {
      await cancelOpenPartnershipTasksUnlocked(db, clientId, timestamp);
    }
    if (shouldSchedulePartnershipWindow(current.status, next)) {
      const draft = buildPartnershipTask({ clientId, changedOn: statusChangedOn, createId });
      regularSince = statusChangedOn;
      const inserted = await insertTaskDeduped(db, draft, timestamp);
      partnershipTask = inserted ? draft : null;
    }

    const result = await db.runAsync(
      `UPDATE clients
       SET status = ?, regular_since = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ? AND deleted_at IS NULL`,
      next,
      regularSince,
      timestamp,
      clientId,
    );
    if (result.changes === 0) throw new DomainError('Клиент не найден');

    const client: Client = { ...current, status: next, regularSince, updatedAt: timestamp };
    await insertOutbox(db, { entity: 'clients', entityId: clientId, op: 'upsert', payload: client });
    return { client, partnershipTask, changed: true };
  });

  if (change.changed) emitDataChanged();
  return { client: change.client, partnershipTask: change.partnershipTask };
}

async function insertClient(db: SQLiteDatabase, prepared: ClientInput): Promise<Client> {
  const timestamp = nowIso();
  const created: Client = {
    id: createId(),
    name: prepared.name,
    phone: prepared.phone,
    status: prepared.status,
    healthTags: [],
    additionalInfo: '',
    clientRequestId: null,
    regularSince: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.runAsync(
    `INSERT INTO clients
      (id, name, phone, status, health_tags, family_notes, client_request_id, regular_since, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, 'pending')`,
    created.id,
    created.name,
    created.phone,
    created.status,
    JSON.stringify(created.healthTags),
    created.additionalInfo,
    timestamp,
    timestamp,
  );
  await insertOutbox(db, { entity: 'clients', entityId: created.id, op: 'upsert', payload: created });
  return created;
}
