import type { SQLiteDatabase } from 'expo-sqlite';

import { DomainError } from '@/domain/errors';
import { courseEndsOn } from '@/domain/touchPlan';
import type { Client, Purchase, TaskListItem } from '@/domain/types';

import type { ClientRow, PurchaseRow, TaskRow } from './rows';
import { asClientStatus, asTaskCategory, asTaskSource, asTaskStatus, asTaskType, parseHealthTags } from './rows';

export function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    status: asClientStatus(row.status),
    healthTags: parseHealthTags(row.health_tags),
    additionalInfo: row.family_notes,
    clientRequestId: row.client_request_id ?? null,
    regularSince: row.regular_since,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPurchase(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    clientId: row.client_id,
    productId: row.product_id,
    productName: row.product_name,
    purchasedOn: row.purchased_on,
    courseEndsOn: courseEndsOn(row.purchased_on, row.duration_days),
    createdAt: row.created_at,
  };
}

export function mapTask(row: TaskRow): TaskListItem {
  return {
    id: row.id,
    clientId: row.client_id,
    purchaseId: row.purchase_id,
    touchOn: row.touch_on,
    type: asTaskType(row.type),
    category: asTaskCategory(row.category),
    title: row.title,
    details: row.details,
    status: asTaskStatus(row.status),
    source: asTaskSource(row.source),
    dedupeKey: row.dedupe_key,
    clientName: row.client_name ?? '',
    clientPhone: row.client_phone ?? '',
    productName: row.product_name ?? null,
  };
}

const CLIENT_COLUMNS = `id, name, phone, status, health_tags, family_notes, client_request_id, regular_since, created_at, updated_at`;

export async function requireClientUnlocked(db: SQLiteDatabase, clientId: string): Promise<Client> {
  const row = await db.getFirstAsync<ClientRow>(
    `SELECT ${CLIENT_COLUMNS} FROM clients WHERE id = ? AND deleted_at IS NULL`,
    clientId,
  );
  if (!row) throw new DomainError('Клиент не найден');
  return mapClient(row);
}

export const TASK_SELECT = `
  SELECT
    t.id, t.client_id, t.purchase_id, t.touch_on, t.type, t.category, t.title, t.details,
    t.status, t.source, t.dedupe_key,
    c.name AS client_name, c.phone AS client_phone, p.name AS product_name
  FROM tasks t
  JOIN clients c ON c.id = t.client_id
  LEFT JOIN purchases pu ON pu.id = t.purchase_id
  LEFT JOIN products p ON p.id = pu.product_id
  WHERE t.deleted_at IS NULL AND c.deleted_at IS NULL
`;

export async function selectTaskRows(db: SQLiteDatabase, sql: string, ...params: (string | number)[]): Promise<TaskListItem[]> {
  const rows = await db.getAllAsync<TaskRow>(sql, ...params);
  return rows.map(mapTask);
}

export async function selectPurchasesUnlocked(db: SQLiteDatabase, clientId: string): Promise<Purchase[]> {
  const rows = await db.getAllAsync<PurchaseRow>(
    `SELECT pu.id, pu.client_id, pu.product_id, pu.purchased_on, pu.created_at,
            p.name AS product_name, p.duration_days
     FROM purchases pu
     JOIN products p ON p.id = pu.product_id
     WHERE pu.client_id = ? AND pu.deleted_at IS NULL
     ORDER BY pu.purchased_on DESC, pu.created_at DESC`,
    clientId,
  );
  return rows.map(mapPurchase);
}
