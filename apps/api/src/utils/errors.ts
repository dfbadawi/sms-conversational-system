import type { Context } from "hono";

export function notFound(c: Context) {
  return c.json({ error: "Not found" }, 404);
}
