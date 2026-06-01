import { SQL } from "bun";
import { env } from "../env";
import { applyMigrations } from "./migrate";

const db = new SQL(env.databaseUrl);

try {
  await applyMigrations(db);
  console.log("Database setup complete");
} finally {
  await db.close();
}
