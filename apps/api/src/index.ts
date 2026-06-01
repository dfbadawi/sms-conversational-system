import { Hono } from "hono";
import { cors } from "hono/cors";
import { closeDb } from "./db/client";
import { env } from "./env";
import { closeSmsQueue } from "./queues/sms.queue";
import { conversationsRoutes } from "./routes/conversations";
import { healthRoutes } from "./routes/health";
import { webhookRoutes } from "./routes/webhook";
import { startOutboxPublisher } from "./services/outbox-publisher";

const app = new Hono();

app.onError((error, c) => {
  console.error("[api] internal error:", error);
  return c.json({ error: "Internal server error" }, 500);
});

app.use(
  "*",
  cors({
    origin: env.corsOrigin,
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.route("/", healthRoutes);
app.route("/", webhookRoutes);
app.route("/", conversationsRoutes);

const publisher = startOutboxPublisher();

async function shutdown(signal: string): Promise<void> {
  console.log(`[api] received ${signal}, shutting down`);
  await publisher.stop();
  await closeSmsQueue();
  await closeDb();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

console.log(`[api] listening on :${env.port}`);

Bun.serve({
  port: env.port,
  fetch: app.fetch,
});
