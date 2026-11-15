import type { SQLiteDatabase } from 'expo-sqlite';

import { assertIsoDate, nowIso } from '@/domain/dates';
import { DomainError } from '@/domain/errors';
import { createId } from '@/domain/ids';
import type { Purchase, TaskDraft } from '@/domain/types';
import { buildPurchaseTasks, courseEndsOn } from '@/domain/touchPlan';
import { enqueueWrite } from '@/db/queue';

import { emitDataChanged } from './events';
import { requireClientUnlocked } from './mappers';
import { insertOutbox } from './outbox';
import { requireProductUnlocked } from './products';
import { insertTaskUnlocked } from './tasks';

export type RecordedPurchase = {
  purchase: Purchase;
  tasks: TaskDraft[];
};

export async function recordPurchase(
  db: SQLiteDatabase,
  input: { clientId: string; productId: string; purchasedOn: string },
): Promise<RecordedPurchase> {
  const purchasedOn = assertIsoDate(input.purchasedOn);
  const recorded = await enqueueWrite(db, async () => {
    const client = await requireClientUnlocked(db, input.clientId);
    const product = await requireProductUnlocked(db, input.productId);
    const timestamp = nowIso();
    const purchaseId = createId();
    const tasks = buildPurchaseTasks({
      purchaseId,
      clientId: client.id,
      product,
      purchasedOn,
      createId,
    });

    await db.runAsync(
      `INSERT INTO purchases
        (id, client_id, product_id, purchased_on, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      purchaseId,
      client.id,
      product.id,
      purchasedOn,
      timestamp,
      timestamp,
    );

    const purchase: Purchase = {
      id: purchaseId,
      clientId: client.id,
      productId: product.id,
      productName: product.name,
      purchasedOn,
      courseEndsOn: courseEndsOn(purchasedOn, product.durationDays),
      createdAt: timestamp,
    };
    await insertOutbox(db, { entity: 'purchases', entityId: purchaseId, op: 'upsert', payload: purchase });

    for (const task of tasks) {
      await insertTaskUnlocked(db, task, timestamp);
    }
    return { purchase, tasks };
  });

  emitDataChanged();
  return recorded;
}

export async function deletePurchase(db: SQLiteDatabase, purchaseId: string): Promise<void> {
  await enqueueWrite(db, async () => {
    const purchase = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM purchases WHERE id = ? AND deleted_at IS NULL`,
      purchaseId,
    );
    if (!purchase) throw new DomainError('Покупка не найдена');

    const timestamp = nowIso();
    const taskRows = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM tasks WHERE purchase_id = ? AND deleted_at IS NULL`,
      purchaseId,
    );
    for (const task of taskRows) {
      await db.runAsync(
        `UPDATE tasks SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL`,
        timestamp,
        timestamp,
        task.id,
      );
      await insertOutbox(db, { entity: 'tasks', entityId: task.id, op: 'delete', payload: { id: task.id } });
    }

    const result = await db.runAsync(
      `UPDATE purchases SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL`,
      timestamp,
      timestamp,
      purchaseId,
    );
    if (result.changes === 0) throw new DomainError('Покупка не найдена');
    await insertOutbox(db, { entity: 'purchases', entityId: purchaseId, op: 'delete', payload: { id: purchaseId } });
  });
  emitDataChanged();
}
