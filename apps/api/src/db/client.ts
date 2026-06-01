import { createSqlClient } from "@sms/shared";
import { env } from "../env";

const client = createSqlClient(env.databaseUrl);

export const db = client.sql;

export type SqlClient = typeof db;

export async function closeDb(): Promise<void> {
  await client.close();
}
