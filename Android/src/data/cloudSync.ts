import type { SQLiteDatabase } from 'expo-sqlite';

import { emitDataChanged } from '@/data/events';
import { ensureSettingsTable } from '@/data/settings';
import { requireSyncSession } from '@/data/syncAuth';
import { enqueueWrite } from '@/db/queue';
import { DomainError } from '@/domain/errors';
import { getSupabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabaseConfig';
import type { RemoteChange } from '@/sync/adapter';
import { pullFromSupabase, pushToSupabase, type PushPackage } from '@/sync/supabaseAdapter';
import { hydrateForPush, isRemoteNewer, listOutboxEntries, sortRemoteChangesForApply } from '@/sync/syncRecords';

const CURSOR_KEY = 'sync_cursor';

async function loadSyncCursor(db: SQLiteDatabase): Promise<string | null> {
  await ensureSettingsTable(db);
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', CURSOR_KEY);
  return row?.value ?? null;
}

async function saveSyncCursor(db: SQLiteDatabase, cursor: string): Promise<void> {
  await ensureSettingsTable(db);
  await db.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    CURSOR_KEY,
    cursor,
  );
}

function syncLog(step: string, detail?: unknown): void {
  if (__DEV__) {
    if (detail !== undefined) console.info(`[sync] ${step}`, detail);
    else console.info(`[sync] ${step}`);
  }
}

export async function runCloudSyncWithSupabase(db: SQLiteDatabase): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new DomainError('Облако не настроено');
  }
  const session = await requireSyncSession();
  const userId = session.user.id;
  const client = getSupabase();
  const cursor = await loadSyncCursor(db);
  syncLog('start', { userId: userId.slice(0, 8), cursor });

  const outbox = await listOutboxEntries(db);
  syncLog('outbox', { count: outbox.length });
  const packages: PushPackage[] = [];
  for (const entry of outbox) {
    const record = await hydrateForPush(db, entry);
    if (!record) continue;
    packages.push({ outboxId: entry.id, entity: entry.entity, op: entry.op, record });
  }

  let pushedIds: string[];
  try {
    pushedIds = await pushToSupabase(client, userId, packages);
    syncLog('push', { packages: packages.length, acked: pushedIds.length });
  } catch (error) {
    syncLog('push_error', error);
    throw error;
  }

  let pulled: Awaited<ReturnType<typeof pullFromSupabase>>;
  try {
    pulled = await pullFromSupabase(client, userId, cursor);
    syncLog('pull', { changes: pulled.changes.length, cursor: pulled.cursor });
  } catch (error) {
    syncLog('pull_error', error);
    throw error;
  }

  let changed = pushedIds.length > 0;
  await enqueueWrite(db, async () => {
    if (pushedIds.length > 0) {
      for (const id of pushedIds) {
        await db.runAsync('DELETE FROM sync_outbox WHERE id = ?', id);
      }
    }
  });

  if (pulled.changes.length > 0) {
    await enqueueWrite(db, async () => {
      const ordered = sortRemoteChangesForApply(pulled.changes);
      for (let pass = 0; pass < 2; pass++) {
        for (const change of ordered) {
          const applied = await applyRemoteChange(db, change);
          if (applied) changed = true;
        }
      }
      if (pulled.cursor) {
        await saveSyncCursor(db, pulled.cursor);
      }
    });
  } else if (pulled.cursor && pulled.cursor !== (cursor ?? '')) {
    await saveSyncCursor(db, pulled.cursor);
  }

  if (changed) emitDataChanged();
}

async function applyRemoteChange(db: SQLiteDatabase, change: RemoteChange): Promise<boolean> {
  const payload = change.payload as Record<string, unknown>;
  const remoteUpdated = change.updatedAt;

  switch (change.entity) {
    case 'clients':
      return applyClient(db, payload, remoteUpdated);
    case 'products':
      return applyProduct(db, payload, remoteUpdated);
    case 'client_requests':
      return applyClientRequest(db, payload, remoteUpdated);
    case 'purchases':
      return applyPurchase(db, payload, remoteUpdated);
    case 'tasks':
      return applyTask(db, payload, remoteUpdated);
    default:
      return false;
  }
}

async function resolveClientRequestId(
  db: SQLiteDatabase,
  clientRequestId: unknown,
): Promise<string | null> {
  if (clientRequestId == null) return null;
  const id = String(clientRequestId);
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM client_requests WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  return row?.id ?? null;
}

async function applyClient(
  db: SQLiteDatabase,
  row: Record<string, unknown>,
  remoteUpdated: string,
): Promise<boolean> {
  const id = String(row.id);
  const local = await db.getFirstAsync<{ updated_at: string }>('SELECT updated_at FROM clients WHERE id = ?', id);
  if (!isRemoteNewer(local?.updated_at, remoteUpdated)) return false;

  const deletedAt = row.deleted_at == null ? null : String(row.deleted_at);
  if (deletedAt && !local) return false;

  const clientRequestId = await resolveClientRequestId(db, row.client_request_id);

  if (local) {
    await db.runAsync(
      `UPDATE clients SET name = ?, phone = ?, status = ?, health_tags = ?, family_notes = ?, client_request_id = ?,
              regular_since = ?, created_at = ?, updated_at = ?, deleted_at = ?, sync_status = 'synced'
       WHERE id = ?`,
      String(row.name),
      String(row.phone ?? ''),
      String(row.status),
      String(row.health_tags ?? '[]'),
      String(row.family_notes ?? ''),
      clientRequestId,
      row.regular_since == null ? null : String(row.regular_since),
      String(row.created_at),
      remoteUpdated,
      deletedAt,
      id,
    );
  } else if (!deletedAt) {
    await db.runAsync(
      `INSERT INTO clients
        (id, name, phone, status, health_tags, family_notes, client_request_id, regular_since,
         created_at, updated_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'synced')`,
      id,
      String(row.name),
      String(row.phone ?? ''),
      String(row.status),
      String(row.health_tags ?? '[]'),
      String(row.family_notes ?? ''),
      clientRequestId,
      row.regular_since == null ? null : String(row.regular_since),
      String(row.created_at),
      remoteUpdated,
    );
  }
  return true;
}

async function applyProduct(
  db: SQLiteDatabase,
  row: Record<string, unknown>,
  remoteUpdated: string,
): Promise<boolean> {
  const id = String(row.id);
  const local = await db.getFirstAsync<{ updated_at: string }>('SELECT updated_at FROM products WHERE id = ?', id);
  if (!isRemoteNewer(local?.updated_at, remoteUpdated)) return false;
  const deletedAt = row.deleted_at == null ? null : String(row.deleted_at);

  if (local) {
    await db.runAsync(
      `UPDATE products SET name = ?, duration_days = ?, created_at = ?, updated_at = ?, deleted_at = ?, sync_status = 'synced'
       WHERE id = ?`,
      String(row.name),
      Number(row.duration_days),
      String(row.created_at),
      remoteUpdated,
      deletedAt,
      id,
    );
  } else if (!deletedAt) {
    await db.runAsync(
      `INSERT INTO products (id, name, duration_days, created_at, updated_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, ?, NULL, 'synced')`,
      id,
      String(row.name),
      Number(row.duration_days),
      String(row.created_at),
      remoteUpdated,
    );
  }
  return true;
}

async function applyClientRequest(
  db: SQLiteDatabase,
  row: Record<string, unknown>,
  remoteUpdated: string,
): Promise<boolean> {
  const id = String(row.id);
  const local = await db.getFirstAsync<{ updated_at: string }>(
    'SELECT updated_at FROM client_requests WHERE id = ?',
    id,
  );
  if (!isRemoteNewer(local?.updated_at, remoteUpdated)) return false;
  const deletedAt = row.deleted_at == null ? null : String(row.deleted_at);

  if (local) {
    await db.runAsync(
      `UPDATE client_requests SET name = ?, created_at = ?, updated_at = ?, deleted_at = ?, sync_status = 'synced'
       WHERE id = ?`,
      String(row.name),
      String(row.created_at),
      remoteUpdated,
      deletedAt,
      id,
    );
  } else if (!deletedAt) {
    await db.runAsync(
      `INSERT INTO client_requests (id, name, created_at, updated_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, NULL, 'synced')`,
      id,
      String(row.name),
      String(row.created_at),
      remoteUpdated,
    );
  }
  return true;
}

async function purchaseParentsExist(
  db: SQLiteDatabase,
  clientId: string,
  productId: string,
): Promise<boolean> {
  const client = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL',
    clientId,
  );
  if (!client) return false;
  const product = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM products WHERE id = ? AND deleted_at IS NULL',
    productId,
  );
  return Boolean(product);
}

async function applyPurchase(
  db: SQLiteDatabase,
  row: Record<string, unknown>,
  remoteUpdated: string,
): Promise<boolean> {
  const id = String(row.id);
  const local = await db.getFirstAsync<{ updated_at: string }>('SELECT updated_at FROM purchases WHERE id = ?', id);
  if (!isRemoteNewer(local?.updated_at, remoteUpdated)) return false;
  const deletedAt = row.deleted_at == null ? null : String(row.deleted_at);

  const clientId = String(row.client_id);
  const productId = String(row.product_id);
  if (!deletedAt && !(await purchaseParentsExist(db, clientId, productId))) {
    return false;
  }

  if (local) {
    await db.runAsync(
      `UPDATE purchases SET client_id = ?, product_id = ?, purchased_on = ?, created_at = ?, updated_at = ?, deleted_at = ?, sync_status = 'synced'
       WHERE id = ?`,
      clientId,
      productId,
      String(row.purchased_on),
      String(row.created_at),
      remoteUpdated,
      deletedAt,
      id,
    );
  } else if (!deletedAt) {
    await db.runAsync(
      `INSERT INTO purchases (id, client_id, product_id, purchased_on, created_at, updated_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, NULL, 'synced')`,
      id,
      clientId,
      productId,
      String(row.purchased_on),
      String(row.created_at),
      remoteUpdated,
    );
  }
  return true;
}

async function resolveTaskPurchaseId(
  db: SQLiteDatabase,
  purchaseId: unknown,
): Promise<string | null> {
  if (purchaseId == null) return null;
  const id = String(purchaseId);
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM purchases WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  return row?.id ?? null;
}

async function applyTask(
  db: SQLiteDatabase,
  row: Record<string, unknown>,
  remoteUpdated: string,
): Promise<boolean> {
  const id = String(row.id);
  const local = await db.getFirstAsync<{ updated_at: string }>('SELECT updated_at FROM tasks WHERE id = ?', id);
  if (!isRemoteNewer(local?.updated_at, remoteUpdated)) return false;
  const deletedAt = row.deleted_at == null ? null : String(row.deleted_at);

  const clientId = String(row.client_id);
  const client = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL',
    clientId,
  );
  if (!deletedAt && !client) return false;

  const purchaseId = await resolveTaskPurchaseId(db, row.purchase_id);

  if (local) {
    await db.runAsync(
      `UPDATE tasks SET client_id = ?, purchase_id = ?, touch_on = ?, type = ?, category = ?, title = ?, details = ?,
              status = ?, source = ?, dedupe_key = ?, created_at = ?, updated_at = ?, deleted_at = ?, sync_status = 'synced'
       WHERE id = ?`,
      clientId,
      purchaseId,
      String(row.touch_on),
      String(row.type),
      String(row.category),
      String(row.title),
      String(row.details ?? ''),
      String(row.status),
      String(row.source),
      String(row.dedupe_key),
      String(row.created_at),
      remoteUpdated,
      deletedAt,
      id,
    );
  } else if (!deletedAt) {
    await db.runAsync(
      `INSERT INTO tasks (
          id, client_id, purchase_id, touch_on, type, category, title, details, status, source, dedupe_key,
          created_at, updated_at, deleted_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'synced')`,
      id,
      clientId,
      purchaseId,
      String(row.touch_on),
      String(row.type),
      String(row.category),
      String(row.title),
      String(row.details ?? ''),
      String(row.status),
      String(row.source),
      String(row.dedupe_key),
      String(row.created_at),
      remoteUpdated,
    );
  }
  return true;
}
