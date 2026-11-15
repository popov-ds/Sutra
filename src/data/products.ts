import type { SQLiteDatabase } from 'expo-sqlite';

import { prepareProductInput } from '@/domain/catalog';
import { nowIso } from '@/domain/dates';
import { DomainError } from '@/domain/errors';
import { createId } from '@/domain/ids';
import type { Product } from '@/domain/types';
import { assertCanAddProduct } from '@/data/subscription';
import { enqueueWrite } from '@/db/queue';

import { emitDataChanged } from './events';
import { insertOutbox } from './outbox';
import type { ProductRow } from './rows';

export function mapProduct(row: ProductRow): Product {
  return { id: row.id, name: row.name, durationDays: row.duration_days };
}

export async function listProducts(db: SQLiteDatabase): Promise<Product[]> {
  return enqueueWrite(db, async () => {
    const rows = await db.getAllAsync<ProductRow>(
      `SELECT id, name, duration_days
       FROM products
       WHERE deleted_at IS NULL
       ORDER BY name COLLATE NOCASE`,
    );
    return rows.map(mapProduct);
  });
}

export async function requireProductUnlocked(db: SQLiteDatabase, productId: string): Promise<Product> {
  const row = await db.getFirstAsync<ProductRow>(
    `SELECT id, name, duration_days FROM products WHERE id = ? AND deleted_at IS NULL`,
    productId,
  );
  if (!row) throw new DomainError('Продукт не найден');
  return mapProduct(row);
}

export async function createProduct(db: SQLiteDatabase, name: string, durationDays: number): Promise<Product> {
  const prepared = prepareProductInput(name, durationDays);
  const product = await enqueueWrite(db, async () => {
    await assertCanAddProduct(db);
    const timestamp = nowIso();
    const created: Product = { id: createId(), ...prepared };
    await db.runAsync(
      `INSERT INTO products
        (id, name, duration_days, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      created.id,
      created.name,
      created.durationDays,
      timestamp,
      timestamp,
    );
    await insertOutbox(db, {
      entity: 'products',
      entityId: created.id,
      op: 'upsert',
      payload: { ...created, createdAt: timestamp, updatedAt: timestamp },
    });
    return created;
  });
  emitDataChanged();
  return product;
}

export async function updateProduct(
  db: SQLiteDatabase,
  productId: string,
  name: string,
  durationDays: number,
): Promise<Product> {
  const prepared = prepareProductInput(name, durationDays);
  const product = await enqueueWrite(db, async () => {
    await requireProductUnlocked(db, productId);
    const timestamp = nowIso();
    const updated: Product = { id: productId, ...prepared };
    const result = await db.runAsync(
      `UPDATE products
       SET name = ?, duration_days = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ? AND deleted_at IS NULL`,
      updated.name,
      updated.durationDays,
      timestamp,
      productId,
    );
    if (result.changes === 0) throw new DomainError('Продукт не найден');
    await insertOutbox(db, {
      entity: 'products',
      entityId: productId,
      op: 'upsert',
      payload: { ...updated, createdAt: timestamp, updatedAt: timestamp },
    });
    return updated;
  });
  emitDataChanged();
  return product;
}

export async function deleteProduct(db: SQLiteDatabase, productId: string): Promise<void> {
  await enqueueWrite(db, async () => {
    await requireProductUnlocked(db, productId);
    const usage = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM purchases WHERE product_id = ? AND deleted_at IS NULL`,
      productId,
    );
    if ((usage?.count ?? 0) > 0) {
      throw new DomainError('Нельзя удалить продукт с покупками');
    }
    const timestamp = nowIso();
    const result = await db.runAsync(
      `UPDATE products SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL`,
      timestamp,
      timestamp,
      productId,
    );
    if (result.changes === 0) throw new DomainError('Продукт не найден');
    await insertOutbox(db, { entity: 'products', entityId: productId, op: 'delete', payload: { id: productId } });
  });
  emitDataChanged();
}
