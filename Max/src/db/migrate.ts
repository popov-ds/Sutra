import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureCloudEmailColumn } from "./users.js";
import { getPool } from "./pool.js";

const sqlDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "sql");

export async function migrate(): Promise<void> {
  const pool = getPool();
  const files = (await fs.readdir(sqlDir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = await fs.readFile(path.join(sqlDir, file), "utf8");
    await pool.query(sql);
  }
  await ensureCloudEmailColumn();
}

if (process.argv[1]?.includes("migrate")) {
  migrate()
    .then(() => {
      console.log("Migrations applied.");
      return import("./pool.js").then((m) => m.closePool());
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}