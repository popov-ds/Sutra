import initSqlJs, { type Database, type SqlValue } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { courseEndsOn } from "../domain/touchPlan.js";
import { todayIso } from "../domain/dates.js";
import { createId, nowIso } from "../domain/ids.js";
import {
  buildPartnershipTask,
  buildPurchaseTasks,
  shouldCancelPartnershipWindow,
  shouldSchedulePartnershipWindow,
  type TaskDraft,
} from "../domain/touchPlan.js";
import {
  DomainError,
  prepareClientInput,
  prepareClientRequestInput,
  prepareProductInput,
  type ClientStatus,
} from "../domain/validate.js";
import { emitDataChanged } from "../data/events.js";
import { SCHEMA_SQL } from "./schema";

const IDB_NAME = "sutra-max-sqlite";
const IDB_STORE = "db";
const IDB_KEY = "main";

const TASK_SELECT = `
SELECT t.id, t.client_id, t.purchase_id, t.touch_on, t.type, t.category, t.title, t.details, t.status,
       t.source, t.dedupe_key, c.name AS client_name, p.name AS product_name
FROM tasks t
JOIN clients c ON c.id = t.client_id
LEFT JOIN purchases pu ON pu.id = t.purchase_id AND pu.deleted_at IS NULL
LEFT JOIN products p ON p.id = pu.product_id AND p.deleted_at IS NULL
WHERE t.deleted_at IS NULL AND c.deleted_at IS NULL`;

let db: Database | null = null;

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadBytes(): Promise<Uint8Array | null> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const get = tx.objectStore(IDB_STORE).get(IDB_KEY);
    get.onsuccess = () => resolve((get.result as Uint8Array | undefined) ?? null);
    get.onerror = () => reject(get.error);
  });
}

async function saveBytes(data: Uint8Array): Promise<void> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(data, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalDb(): Promise<Database> {
  if (db) return db;
  const SQL = await initSqlJs({
    locateFile: (file: string) => (file.endsWith(".wasm") ? sqlWasmUrl : file),
    useOldExtensionFunctions: false,
  });
  const saved = await loadBytes();
  db = saved ? new SQL.Database(saved) : new SQL.Database();
  db.run(SCHEMA_SQL);
  if (!saved) await persistDb();
  return db;
}

export async function persistDb(): Promise<void> {
  if (!db) return;
  const data = db.export();
  await saveBytes(data);
}

/** Сохранить БД и уведомить подписчиков (автосинх, как Android emitDataChanged). */
export async function persistLocalChanges(): Promise<void> {
  await persistDb();
  emitDataChanged();
}

function markOverdueUnlocked(database: Database, today: string): void {
  database.run(
    `UPDATE tasks SET status = 'overdue', updated_at = ?
     WHERE status = 'pending' AND touch_on < ? AND deleted_at IS NULL`,
    [nowIso(), today],
  );
}

function insertTaskUnlocked(database: Database, task: TaskDraft, timestamp: string): void {
  database.run(
    `INSERT INTO tasks (id, client_id, purchase_id, touch_on, type, category, title, details, status, source, dedupe_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    [
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
    ],
  );
}

function insertTaskDeduped(database: Database, task: TaskDraft, timestamp: string): boolean {
  const stmt = database.prepare(`SELECT id, deleted_at FROM tasks WHERE dedupe_key = ?`);
  stmt.bind([task.dedupeKey]);
  let existing: { id: string; deleted_at: string | null } | null = null;
  if (stmt.step()) {
    existing = stmt.getAsObject() as { id: string; deleted_at: string | null };
  }
  stmt.free();
  if (existing) {
    if (!existing.deleted_at) return false;
    database.run(`DELETE FROM tasks WHERE id = ?`, [existing.id]);
  }
  insertTaskUnlocked(database, task, timestamp);
  return true;
}

function cancelOpenPartnershipTasksUnlocked(database: Database, clientId: string, timestamp: string): void {
  database.run(
    `UPDATE tasks SET deleted_at = ?, updated_at = ?
     WHERE client_id = ? AND type = 'partnership_offer' AND status != 'done' AND deleted_at IS NULL`,
    [timestamp, timestamp, clientId],
  );
}

export type TaskListItem = {
  id: string;
  clientId: string;
  purchaseId: string | null;
  touchOn: string;
  type: string;
  category: string;
  title: string;
  details: string;
  status: string;
  source: string;
  clientName: string;
  productName: string | null;
};

function mapTaskStmt(stmt: ReturnType<Database["prepare"]>): TaskListItem[] {
  const out: TaskListItem[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, string | null>;
    out.push({
      id: String(row.id),
      clientId: String(row.client_id),
      purchaseId: row.purchase_id ? String(row.purchase_id) : null,
      touchOn: String(row.touch_on),
      type: String(row.type),
      category: String(row.category),
      title: String(row.title),
      details: String(row.details ?? ""),
      status: String(row.status),
      source: String(row.source),
      clientName: String(row.client_name),
      productName: row.product_name ? String(row.product_name) : null,
    });
  }
  stmt.free();
  return out;
}

function selectTasks(database: Database, extraWhere: string, ...bind: SqlValue[]): TaskListItem[] {
  const stmt = database.prepare(`${TASK_SELECT} AND ${extraWhere}`);
  if (bind.length) stmt.bind(bind);
  return mapTaskStmt(stmt);
}

export async function countClients(): Promise<number> {
  const database = await getLocalDb();
  const row = database.exec(`SELECT COUNT(*) AS c FROM clients WHERE deleted_at IS NULL`)[0];
  const v = row?.values[0]?.[0];
  return typeof v === "number" ? v : Number(v ?? 0);
}

export async function loadDayBoard(
  day: string,
  today: string,
): Promise<{ tasks: TaskListItem[]; overdue: TaskListItem[] }> {
  const database = await getLocalDb();
  markOverdueUnlocked(database, today);
  const tasks = selectTasks(
    database,
    `t.touch_on = ? AND t.status NOT IN ('done', 'skipped')
     ORDER BY CASE t.category WHEN 'service' THEN 0 WHEN 'upsell' THEN 1 ELSE 2 END, c.name, t.title`,
    day,
  );
  const overdue =
    day === today
      ? selectTasks(
          database,
          `t.touch_on < ? AND t.status != 'done'
           ORDER BY t.touch_on, c.name`,
          today,
        )
      : [];
  return { tasks, overdue };
}

export async function completeTask(taskId: string): Promise<void> {
  const database = await getLocalDb();
  const ts = nowIso();
  database.run(`UPDATE tasks SET status = 'done', updated_at = ? WHERE id = ? AND deleted_at IS NULL`, [ts, taskId]);
}

export async function listClients(): Promise<
  Array<{ id: string; name: string; phone: string; status: string }>
> {
  const database = await getLocalDb();
  const stmt = database.prepare(
    `SELECT id, name, phone, status FROM clients
     WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE`,
  );
  const out: Array<{ id: string; name: string; phone: string; status: string }> = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { id: string; name: string; phone: string; status: string };
    out.push(row);
  }
  stmt.free();
  return out;
}

export async function listProducts(): Promise<Array<{ id: string; name: string; durationDays: number }>> {
  const database = await getLocalDb();
  const stmt = database.prepare(
    `SELECT id, name, duration_days FROM products WHERE deleted_at IS NULL ORDER BY name`,
  );
  const out: Array<{ id: string; name: string; durationDays: number }> = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { id: string; name: string; duration_days: number };
    out.push({ id: row.id, name: row.name, durationDays: row.duration_days });
  }
  stmt.free();
  return out;
}

export async function listClientRequests(): Promise<Array<{ id: string; name: string }>> {
  const database = await getLocalDb();
  const stmt = database.prepare(
    `SELECT id, name FROM client_requests WHERE deleted_at IS NULL ORDER BY name`,
  );
  const out: Array<{ id: string; name: string }> = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { id: string; name: string };
    out.push(row);
  }
  stmt.free();
  return out;
}

export type ClientRecord = {
  id: string;
  name: string;
  phone: string;
  status: ClientStatus;
  clientRequestId: string | null;
  additionalInfo: string;
  regularSince: string | null;
};

export async function getClient(clientId: string): Promise<ClientRecord | null> {
  const database = await getLocalDb();
  const stmt = database.prepare(
    `SELECT id, name, phone, status, client_request_id, family_notes, regular_since
     FROM clients WHERE id = ? AND deleted_at IS NULL`,
  );
  stmt.bind([clientId]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject() as {
    id: string;
    name: string;
    phone: string;
    status: string;
    client_request_id: string | null;
    family_notes: string;
    regular_since: string | null;
  };
  stmt.free();
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    status: row.status as ClientStatus,
    clientRequestId: row.client_request_id,
    additionalInfo: row.family_notes ?? "",
    regularSince: row.regular_since,
  };
}

export type ClientCard = {
  client: ClientRecord;
  purchases: Array<{ id: string; productId: string; productName: string; purchasedOn: string; courseEndsOn: string }>;
  tasks: TaskListItem[];
};

export async function loadClientCard(clientId: string): Promise<ClientCard | null> {
  const database = await getLocalDb();
  const today = todayIso();
  markOverdueUnlocked(database, today);
  const client = await getClient(clientId);
  if (!client) return null;
  const purchases = await listPurchasesForClient(clientId);
  const tasks = selectTasks(database, `t.client_id = ? ORDER BY t.touch_on, t.title`, clientId);
  return { client, purchases, tasks };
}

function countActive(database: Awaited<ReturnType<typeof getLocalDb>>, table: string): number {
  const row = database.exec(`SELECT COUNT(*) AS c FROM ${table} WHERE deleted_at IS NULL`)[0];
  return Number(row?.values[0]?.[0] ?? 0);
}

async function assertCanAddClients(isPro: boolean, freeLimit: number): Promise<void> {
  if (isPro) return;
  const database = await getLocalDb();
  if (countActive(database, "clients") >= freeLimit) {
    throw new DomainError("free_limit_clients", freeLimit);
  }
}

async function assertCanAddProducts(isPro: boolean, freeLimit: number): Promise<void> {
  if (isPro) return;
  const database = await getLocalDb();
  if (countActive(database, "products") >= freeLimit) {
    throw new DomainError("free_limit_products", freeLimit);
  }
}

async function assertCanAddClientRequests(isPro: boolean, freeLimit: number): Promise<void> {
  if (isPro) return;
  const database = await getLocalDb();
  if (countActive(database, "client_requests") >= freeLimit) {
    throw new DomainError("free_limit_requests", freeLimit);
  }
}

export async function createClientRecord(
  input: { name: string; phone: string; status: string },
  isPro: boolean,
  freeLimit: number,
): Promise<string> {
  const prepared = prepareClientInput(input);
  await assertCanAddClients(isPro, freeLimit);
  const database = await getLocalDb();
  const ts = nowIso();
  const id = createId();
  database.run(
    `INSERT INTO clients (id, name, phone, status, family_notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', ?, ?)`,
    [id, prepared.name, prepared.phone, prepared.status, ts, ts],
  );
  return id;
}

export async function updateClientProfile(
  clientId: string,
  input: { name: string; phone: string; clientRequestId: string | null; additionalInfo: string },
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new DomainError("client_name_required");
  if (name.length > 120) throw new DomainError("client_name_too_long");
  const phone = input.phone.trim();
  if (phone.length > 40) throw new DomainError("phone_too_long");
  const additionalInfo = input.additionalInfo.trim();
  if (additionalInfo.length > 4000) throw new DomainError("additional_info_too_long");
  const database = await getLocalDb();
  if (input.clientRequestId) {
    const stmt = database.prepare(
      `SELECT id FROM client_requests WHERE id = ? AND deleted_at IS NULL`,
    );
    stmt.bind([input.clientRequestId]);
    if (!stmt.step()) {
      stmt.free();
      throw new DomainError("client_request_not_found");
    }
    stmt.free();
  }
  const ts = nowIso();
  database.run(
    `UPDATE clients SET name=?, phone=?, client_request_id=?, family_notes=?, updated_at=?
     WHERE id=? AND deleted_at IS NULL`,
    [name, phone, input.clientRequestId, additionalInfo, ts, clientId],
  );
}

export type StatusChange = {
  partnershipTask: TaskDraft | null;
};

export async function updateClientStatus(
  clientId: string,
  next: ClientStatus,
  changedOn = todayIso(),
): Promise<StatusChange> {
  const database = await getLocalDb();
  const current = await getClient(clientId);
  if (!current) throw new DomainError("client_not_found");
  if (current.status === next) return { partnershipTask: null };

  const ts = nowIso();
  let partnershipTask: TaskDraft | null = null;
  let regularSince = current.regularSince;
  if (shouldCancelPartnershipWindow(current.status, next)) {
    cancelOpenPartnershipTasksUnlocked(database, clientId, ts);
  }
  if (shouldSchedulePartnershipWindow(current.status, next)) {
    const draft = buildPartnershipTask({ clientId, changedOn });
    regularSince = changedOn;
    if (insertTaskDeduped(database, draft, ts)) partnershipTask = draft;
  }
  database.run(
    `UPDATE clients SET status=?, regular_since=?, updated_at=? WHERE id=? AND deleted_at IS NULL`,
    [next, regularSince, ts, clientId],
  );
  return { partnershipTask };
}

/** @deprecated use updateClientProfile + updateClientStatus */
export async function updateClientRecord(
  clientId: string,
  input: { name: string; phone: string; status: string; clientRequestId: string | null; additionalInfo: string },
): Promise<void> {
  const current = await getClient(clientId);
  if (!current) throw new DomainError("client_not_found");
  await updateClientProfile(clientId, {
    name: input.name,
    phone: input.phone,
    clientRequestId: input.clientRequestId,
    additionalInfo: input.additionalInfo,
  });
  if (input.status !== current.status) {
    await updateClientStatus(clientId, input.status as ClientStatus);
  }
}

export async function deleteClientRecord(clientId: string): Promise<void> {
  const database = await getLocalDb();
  const ts = nowIso();
  database.run(`UPDATE tasks SET deleted_at=?, updated_at=? WHERE client_id=?`, [ts, ts, clientId]);
  database.run(`UPDATE purchases SET deleted_at=?, updated_at=? WHERE client_id=?`, [ts, ts, clientId]);
  database.run(`UPDATE clients SET deleted_at=?, updated_at=? WHERE id=?`, [ts, ts, clientId]);
}

export async function listPurchasesForClient(clientId: string): Promise<
  Array<{ id: string; productId: string; productName: string; purchasedOn: string; courseEndsOn: string }>
> {
  const database = await getLocalDb();
  const stmt = database.prepare(
    `SELECT pu.id, pu.product_id, pu.purchased_on, pr.name AS product_name, pr.duration_days
     FROM purchases pu
     JOIN products pr ON pr.id = pu.product_id
     WHERE pu.client_id = ? AND pu.deleted_at IS NULL AND pr.deleted_at IS NULL
     ORDER BY pu.purchased_on DESC`,
  );
  stmt.bind([clientId]);
  const out: Array<{
    id: string;
    productId: string;
    productName: string;
    purchasedOn: string;
    courseEndsOn: string;
  }> = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as {
      id: string;
      product_id: string;
      purchased_on: string;
      product_name: string;
      duration_days: number;
    };
    out.push({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      purchasedOn: row.purchased_on,
      courseEndsOn: courseEndsOn(row.purchased_on, row.duration_days),
    });
  }
  stmt.free();
  return out;
}

export async function recordPurchaseForClient(
  clientId: string,
  productId: string,
  purchasedOn?: string,
): Promise<TaskDraft[]> {
  const database = await getLocalDb();
  const day = purchasedOn ?? todayIso();
  const ts = nowIso();
  const productStmt = database.prepare(
    `SELECT name, duration_days FROM products WHERE id=? AND deleted_at IS NULL`,
  );
  productStmt.bind([productId]);
  if (!productStmt.step()) {
    productStmt.free();
    throw new DomainError("product_not_found");
  }
  const product = productStmt.getAsObject() as { name: string; duration_days: number };
  productStmt.free();

  const purchaseId = createId();
  database.run(
    `INSERT INTO purchases (id, client_id, product_id, purchased_on, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [purchaseId, clientId, productId, day, ts, ts],
  );

  const drafts = buildPurchaseTasks({
    purchaseId,
    clientId,
    product: { name: product.name, durationDays: product.duration_days },
    purchasedOn: day,
  });
  for (const task of drafts) {
    insertTaskUnlocked(database, task, ts);
  }
  return drafts;
}

export async function deletePurchaseRecord(purchaseId: string): Promise<void> {
  const database = await getLocalDb();
  const ts = nowIso();
  database.run(`UPDATE tasks SET deleted_at=?, updated_at=? WHERE purchase_id=?`, [ts, ts, purchaseId]);
  database.run(`UPDATE purchases SET deleted_at=?, updated_at=? WHERE id=?`, [ts, ts, purchaseId]);
}

export async function createProductRecord(
  name: string,
  durationDays: number,
  isPro: boolean,
  freeLimit: number,
): Promise<void> {
  const prepared = prepareProductInput(name, durationDays);
  await assertCanAddProducts(isPro, freeLimit);
  const database = await getLocalDb();
  const ts = nowIso();
  database.run(
    `INSERT INTO products (id, name, duration_days, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    [createId(), prepared.name, prepared.durationDays, ts, ts],
  );
}

export async function updateProductRecord(id: string, name: string, durationDays: number): Promise<void> {
  const prepared = prepareProductInput(name, durationDays);
  const database = await getLocalDb();
  const ts = nowIso();
  database.run(
    `UPDATE products SET name=?, duration_days=?, updated_at=? WHERE id=? AND deleted_at IS NULL`,
    [prepared.name, prepared.durationDays, ts, id],
  );
}

export async function deleteProductRecord(id: string): Promise<void> {
  const database = await getLocalDb();
  const stmt = database.prepare(
    `SELECT COUNT(*) AS c FROM purchases WHERE product_id=? AND deleted_at IS NULL`,
  );
  stmt.bind([id]);
  stmt.step();
  const count = Number((stmt.getAsObject() as { c: number }).c ?? 0);
  stmt.free();
  if (count > 0) throw new DomainError("product_in_use");
  const ts = nowIso();
  database.run(`UPDATE products SET deleted_at=?, updated_at=? WHERE id=? AND deleted_at IS NULL`, [ts, ts, id]);
}

export async function createClientRequestRecord(name: string, isPro: boolean, freeLimit: number): Promise<void> {
  const prepared = prepareClientRequestInput(name);
  await assertCanAddClientRequests(isPro, freeLimit);
  const database = await getLocalDb();
  const ts = nowIso();
  database.run(
    `INSERT INTO client_requests (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
    [createId(), prepared.name, ts, ts],
  );
}

export async function updateClientRequestRecord(id: string, name: string): Promise<void> {
  const prepared = prepareClientRequestInput(name);
  const database = await getLocalDb();
  const ts = nowIso();
  database.run(
    `UPDATE client_requests SET name=?, updated_at=? WHERE id=? AND deleted_at IS NULL`,
    [prepared.name, ts, id],
  );
}

export async function deleteClientRequestRecord(id: string): Promise<void> {
  const database = await getLocalDb();
  const stmt = database.prepare(
    `SELECT COUNT(*) AS c FROM clients WHERE client_request_id=? AND deleted_at IS NULL`,
  );
  stmt.bind([id]);
  stmt.step();
  const count = Number((stmt.getAsObject() as { c: number }).c ?? 0);
  stmt.free();
  if (count > 0) throw new DomainError("request_in_use");
  const ts = nowIso();
  database.run(
    `UPDATE client_requests SET deleted_at=?, updated_at=? WHERE id=? AND deleted_at IS NULL`,
    [ts, ts, id],
  );
}