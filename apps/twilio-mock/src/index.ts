import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import { healthRoutes } from "./routes/health";
import { sendRoutes } from "./routes/send";
import { simulateRoutes } from "./routes/simulate";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: env.corsOrigin,
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.route("/", healthRoutes);
app.route("/", simulateRoutes);
app.route("/", sendRoutes);

console.log(`[twilio-mock] listening on :${env.port}`);
console.log(`[twilio-mock] webhook target ${env.apiWebhookUrl}`);

Bun.serve({
  port: env.port,
  fetch: app.fetch,
});
