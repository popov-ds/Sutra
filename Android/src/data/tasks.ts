import type { SQLiteDatabase } from 'expo-sqlite';

import { nowIso, todayIso } from '@/domain/dates';
import { DomainError } from '@/domain/errors';
import type { TaskDraft, TaskListItem } from '@/domain/types';
import { enqueueWrite } from '@/db/queue';

import { emitDataChanged } from './events';
import { mapTask, selectTaskRows, TASK_SELECT } from './mappers';
import { insertOutbox } from './outbox';
import type { TaskRow } from './rows';

export type DayBoard = {
  day: string;
  today: string;
  tasks: TaskListItem[];
  overdue: TaskListItem[];
};

export type DigestRow = {
  touchOn: string;
  clientName: string;
  title: string;
  type: TaskListItem['type'];
  category: TaskListItem['category'];
  productName: string | null;
};

/** Inserts unless an active row with the same dedupe_key exists; soft-deleted rows are removed first. */
export async function insertTaskDeduped(db: SQLiteDatabase, task: TaskDraft, timestamp: string): Promise<boolean> {
  const existing = await db.getFirstAsync<{ id: string; deleted_at: string | null }>(
    `SELECT id, deleted_at FROM tasks WHERE dedupe_key = ?`,
    task.dedupeKey,
  );
  if (existing) {
    if (!existing.deleted_at) return false;
    await db.runAsync(`DELETE FROM tasks WHERE id = ?`, existing.id);
  }
  await insertTaskUnlocked(db, task, timestamp);
  return true;
}

/** Soft-deletes open partnership_window tasks for a client (pending or overdue). */
export async function cancelOpenPartnershipTasksUnlocked(
  db: SQLiteDatabase,
  clientId: string,
  timestamp: string,
): Promise<void> {
  const taskRows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM tasks
     WHERE client_id = ? AND type = 'partnership_offer' AND status != 'done' AND deleted_at IS NULL`,
    clientId,
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
}

export async function insertTaskUnlocked(db: SQLiteDatabase, task: TaskDraft, timestamp: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO tasks (
      id, client_id, purchase_id, touch_on, type, category, title, details, status, source, dedupe_key,
      created_at, updated_at, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 'pending')`,
    task.id,
    task.clientId,
    task.purchaseId,
    task.touchOn,
    task.type,
    task.category,
    task.title,
    task.details,
    task.source,
    task.dedupeKey,
    timestamp,
    timestamp,
  );
  await insertOutbox(db, {
    entity: 'tasks',
    entityId: task.id,
    op: 'upsert',
    payload: { ...task, createdAt: timestamp, updatedAt: timestamp },
  });
}

export async function markOverdueUnlocked(db: SQLiteDatabase, today: string): Promise<void> {
  const due = await db.getAllAsync<TaskRow>(
    `SELECT id, client_id, purchase_id, touch_on, type, category, title, details, status, source, dedupe_key
     FROM tasks
     WHERE status = 'pending' AND touch_on < ? AND deleted_at IS NULL`,
    today,
  );
  if (due.length === 0) return;

  const updatedAt = nowIso();
  for (const row of due) {
    await db.runAsync(
      `UPDATE tasks SET status = 'overdue', updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      updatedAt,
      row.id,
    );
    await insertOutbox(db, {
      entity: 'tasks',
      entityId: row.id,
      op: 'upsert',
      payload: { ...mapTask({ ...row, status: 'overdue' }), updatedAt },
    });
  }
}

export async function markOverdueTasks(db: SQLiteDatabase, today: string): Promise<void> {
  await enqueueWrite(db, () => markOverdueUnlocked(db, today));
}

export async function loadDayBoard(db: SQLiteDatabase, day: string): Promise<DayBoard> {
  const today = todayIso();
  return enqueueWrite(db, async () => {
    await markOverdueUnlocked(db, today);
    const tasks = await selectTaskRows(
      db,
      `${TASK_SELECT} AND t.touch_on = ?
       ORDER BY CASE t.category WHEN 'service' THEN 0 WHEN 'upsell' THEN 1 ELSE 2 END, c.name, t.title`,
      day,
    );
    const overdue =
      day === today
        ? await selectTaskRows(
            db,
            `${TASK_SELECT} AND t.touch_on < ? AND t.status != 'done'
             ORDER BY t.touch_on, c.name`,
            today,
          )
        : [];
    return { day, today, tasks, overdue };
  });
}

export async function listDigestTasks(db: SQLiteDatabase, fromDay: string, toDay: string): Promise<DigestRow[]> {
  const today = todayIso();
  return enqueueWrite(db, async () => {
    await markOverdueUnlocked(db, today);
    const tasks = await selectTaskRows(
      db,
      `${TASK_SELECT} AND t.status != 'done' AND t.touch_on >= ? AND t.touch_on <= ?
       ORDER BY t.touch_on, c.name, t.title`,
      fromDay,
      toDay,
    );
    return tasks.map((task) => ({
      touchOn: task.touchOn,
      clientName: task.clientName,
      title: task.title,
      type: task.type,
      category: task.category,
      productName: task.productName,
    }));
  });
}

export async function completeTask(db: SQLiteDatabase, taskId: string): Promise<void> {
  const changed = await enqueueWrite(db, async () => {
    const rows = await selectTaskRows(db, `${TASK_SELECT} AND t.id = ?`, taskId);
    const task = rows[0];
    if (!task) throw new DomainError('Задача не найдена');
    if (task.status === 'done') return false;

    const updatedAt = nowIso();
    await db.runAsync(
      `UPDATE tasks SET status = 'done', updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      updatedAt,
      taskId,
    );
    await insertOutbox(db, {
      entity: 'tasks',
      entityId: taskId,
      op: 'upsert',
      payload: { ...task, status: 'done', updatedAt },
    });
    return true;
  });
  if (changed) emitDataChanged();
}
