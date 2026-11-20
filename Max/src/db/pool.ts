import pg from "pg";
import { config } from "../config.js";

let pool: pg.Pool | null = null;

export function dbEnabled(): boolean {
  return Boolean(config.databaseUrl);
}

export function getPool(): pg.Pool {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}