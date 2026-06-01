import type { SQL } from "bun";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const migrationsDir = new URL("./migrations", import.meta.url).pathname;

export async function applyMigrations(db: SQL): Promise<void> {
  const migrationFiles = (await readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const fileName of migrationFiles) {
    console.log(`Applying ${fileName}`);
    const migrationPath = join(migrationsDir, fileName);
    const sql = await Bun.file(migrationPath).text();
    await db.unsafe(sql);
  }
}
