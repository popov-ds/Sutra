import type { Database, SqlValue } from "sql.js";
import type { RemoteChange, SyncEntity } from "./syncTypes.js";
import { isRemoteNewer, sortRemoteChangesForApply } from "./syncTypes.js";

function queryOne(db: Database, sql: string, params: SqlValue[]): Record<string, unknown> | null {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject() as Record<string, unknown>;
  stmt.free();
  return row;
}

function resolveClientRequestId(db: Database, clientRequestId: unknown): string | null {
  if (clientRequestId == null) return null;
  const id = String(clientRequestId);
  const row = queryOne(db, "SELECT id FROM client_requests WHERE id = ? AND deleted_at IS NULL", [id]);
  return row ? String(row.id) : null;
}

function applyClient(db: Database, row: Record<string, unknown>, remoteUpdated: string): boolean {
  const id = String(row.id);
  const local = queryOne(db, "SELECT updated_at FROM clients WHERE id = ?", [id]);
  if (!isRemoteNewer(local?.updated_at as string | undefined, remoteUpdated)) return false;

  const deletedAt = row.deleted_at == null ? null : String(row.deleted_at);
  if (deletedAt && !local) return false;

  const clientRequestId = resolveClientRequestId(db, row.client_request_id);

  if (local) {
    db.run(
      `UPDATE clients SET name = ?, phone = ?, status = ?, health_tags = ?, family_notes = ?, client_request_id = ?,
              regular_since = ?, created_at = ?, updated_at = ?, deleted_at = ?
       WHERE id = ?`,
      [
        String(row.name),
        String(row.phone ?? ""),
        String(row.status),
        String(row.health_tags ?? "[]"),
        String(row.family_notes ?? ""),
        clientRequestId,
        row.regular_since == null ? null : String(row.regular_since),
        String(row.created_at),
        remoteUpdated,
        deletedAt,
        id,
      ],
    );
  } else if (!deletedAt) {
    db.run(
      `INSERT INTO clients
        (id, name, phone, status, health_tags, family_notes, client_request_id, regular_since,
         created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        id,
        String(row.name),
        String(row.phone ?? ""),
        String(row.status),
        String(row.health_tags ?? "[]"),
        String(row.family_notes ?? ""),
        clientRequestId,
        row.regular_since == null ? null : String(row.regular_since),
        String(row.created_at),
        remoteUpdated,
      ],
    );
  }
  return true;
}

function applyProduct(db: Database, row: Record<string, unknown>, remoteUpdated: string): boolean {
  const id = String(row.id);
  const local = queryOne(db, "SELECT updated_at FROM products WHERE id = ?", [id]);
  if (!isRemoteNewer(local?.updated_at as string | undefined, remoteUpdated)) return false;
  const deletedAt = row.deleted_at == null ? null : String(row.deleted_at);

  if (local) {
    db.run(
      `UPDATE products SET name = ?, duration_days = ?, created_at = ?, updated_at = ?, deleted_at = ?
       WHERE id = ?`,
      [
        String(row.name),
        Number(row.duration_days),
        String(row.created_at),
        remoteUpdated,
        deletedAt,
        id,
      ],
    );
  } else if (!deletedAt) {
    db.run(
      `INSERT INTO products (id, name, duration_days, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, NULL)`,
      [id, String(row.name), Number(row.duration_days), String(row.created_at), remoteUpdated],
    );
  }
  return true;
}

function applyClientRequest(db: Database, row: Record<string, unknown>, remoteUpdated: string): boolean {
  const id = String(row.id);
  const local = queryOne(db, "SELECT updated_at FROM client_requests WHERE id = ?", [id]);
  if (!isRemoteNewer(local?.updated_at as string | undefined, remoteUpdated)) return false;
  const deletedAt = row.deleted_at == null ? null : String(row.deleted_at);

  if (local) {
    db.run(
      `UPDATE client_requests SET name = ?, created_at = ?, updated_at = ?, deleted_at = ? WHERE id = ?`,
      [String(row.name), String(row.created_at), remoteUpdated, deletedAt, id],
    );
  } else if (!deletedAt) {
    db.run(
      `INSERT INTO client_requests (id, name, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, NULL)`,
      [id, String(row.name), String(row.created_at), remoteUpdated],
    );
  }
  return true;
}

function purchaseParentsExist(db: Database, clientId: string, productId: string): boolean {
  const client = queryOne(db, "SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL", [clientId]);
  if (!client) return false;
  const product = queryOne(db, "SELECT id FROM products WHERE id = ? AND deleted_at IS NULL", [productId]);
  return Boolean(product);
}

function applyPurchase(db: Database, row: Record<string, unknown>, remoteUpdated: string): boolean {
  const id = String(row.id);
  const local = queryOne(db, "SELECT updated_at FROM purchases WHERE id = ?", [id]);
  if (!isRemoteNewer(local?.updated_at as string | undefined, remoteUpdated)) return false;
  const deletedAt = row.deleted_at == null ? null : String(row.deleted_at);

  const clientId = String(row.client_id);
  const productId = String(row.product_id);
  if (!deletedAt && !purchaseParentsExist(db, clientId, productId)) return false;

  if (local) {
    db.run(
      `UPDATE purchases SET client_id = ?, product_id = ?, purchased_on = ?, created_at = ?, updated_at = ?, deleted_at = ?
       WHERE id = ?`,
      [
        clientId,
        productId,
        String(row.purchased_on),
        String(row.created_at),
        remoteUpdated,
        deletedAt,
        id,
      ],
    );
  } else if (!deletedAt) {
    db.run(
      `INSERT INTO purchases (id, client_id, product_id, purchased_on, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      [id, clientId, productId, String(row.purchased_on), String(row.created_at), remoteUpdated],
    );
  }
  return true;
}

function resolveTaskPurchaseId(db: Database, purchaseId: unknown): string | null {
  if (purchaseId == null) return null;
  const id = String(purchaseId);
  const row = queryOne(db, "SELECT id FROM purchases WHERE id = ? AND deleted_at IS NULL", [id]);
  return row ? String(row.id) : null;
}

function applyTask(db: Database, row: Record<string, unknown>, remoteUpdated: string): boolean {
  const id = String(row.id);
  const local = queryOne(db, "SELECT updated_at FROM tasks WHERE id = ?", [id]);
  if (!isRemoteNewer(local?.updated_at as string | undefined, remoteUpdated)) return false;
  const deletedAt = row.deleted_at == null ? null : String(row.deleted_at);

  const clientId = String(row.client_id);
  const client = queryOne(db, "SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL", [clientId]);
  if (!deletedAt && !client) return false;

  const purchaseId = resolveTaskPurchaseId(db, row.purchase_id);

  if (local) {
    db.run(
      `UPDATE tasks SET client_id = ?, purchase_id = ?, touch_on = ?, type = ?, category = ?, title = ?, details = ?,
              status = ?, source = ?, dedupe_key = ?, created_at = ?, updated_at = ?, deleted_at = ?
       WHERE id = ?`,
      [
        clientId,
        purchaseId,
        String(row.touch_on),
        String(row.type),
        String(row.category),
        String(row.title),
        String(row.details ?? ""),
        String(row.status),
        String(row.source),
        String(row.dedupe_key),
        String(row.created_at),
        remoteUpdated,
        deletedAt,
        id,
      ],
    );
  } else if (!deletedAt) {
    db.run(
      `INSERT INTO tasks (
          id, client_id, purchase_id, touch_on, type, category, title, details, status, source, dedupe_key,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        id,
        clientId,
        purchaseId,
        String(row.touch_on),
        String(row.type),
        String(row.category),
        String(row.title),
        String(row.details ?? ""),
        String(row.status),
        String(row.source),
        String(row.dedupe_key),
        String(row.created_at),
        remoteUpdated,
      ],
    );
  }
  return true;
}

function applyRemoteChange(db: Database, change: RemoteChange): boolean {
  const payload = change.payload as Record<string, unknown>;
  const remoteUpdated = change.updatedAt;

  switch (change.entity) {
    case "clients":
      return applyClient(db, payload, remoteUpdated);
    case "products":
      return applyProduct(db, payload, remoteUpdated);
    case "client_requests":
      return applyClientRequest(db, payload, remoteUpdated);
    case "purchases":
      return applyPurchase(db, payload, remoteUpdated);
    case "tasks":
      return applyTask(db, payload, remoteUpdated);
    default:
      return false;
  }
}

export function applyRemoteChanges(db: Database, changes: RemoteChange[]): number {
  const ordered = sortRemoteChangesForApply(changes);
  let applied = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (const change of ordered) {
      if (applyRemoteChange(db, change)) applied++;
    }
  }
  return applied;
}

const ENTITY_SELECT: Record<SyncEntity, string> = {
  client_requests: "SELECT id, name, created_at, updated_at, deleted_at FROM client_requests",
  products: "SELECT id, name, duration_days, created_at, updated_at, deleted_at FROM products",
  clients: `SELECT id, name, phone, status, health_tags, family_notes, client_request_id, regular_since,
            created_at, updated_at, deleted_at FROM clients`,
  purchases:
    "SELECT id, client_id, product_id, purchased_on, created_at, updated_at, deleted_at FROM purchases",
  tasks: `SELECT id, client_id, purchase_id, touch_on, type, category, title, details, status, source, dedupe_key,
          created_at, updated_at, deleted_at FROM tasks`,
};

export function loadLocalRowsForPush(db: Database, entity: SyncEntity): Record<string, unknown>[] {
  const stmt = db.prepare(ENTITY_SELECT[entity]);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return rows;
}