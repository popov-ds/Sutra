import type { SQLiteDatabase } from 'expo-sqlite';

let tail: Promise<void> = Promise.resolve();

/**
 * Serializes access so a statement started outside a transaction callback
 * cannot land inside an open BEGIN/COMMIT.
 * expo-sqlite includes every query that runs while a transaction is active.
 */
export function enqueueWrite<T>(db: SQLiteDatabase, task: () => Promise<T>): Promise<T> {
  const run = tail.then(async () => {
    let value!: T;
    await db.withTransactionAsync(async () => {
      value = await task();
    });
    return value;
  });

  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
