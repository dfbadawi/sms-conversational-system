import { SQL } from "bun";

export function createSqlClient(databaseUrl: string) {
  const sql = new SQL(databaseUrl);

  return {
    sql,
    async close() {
      await sql.close();
    },
  };
}

export type SqlClient = ReturnType<typeof createSqlClient>["sql"];
