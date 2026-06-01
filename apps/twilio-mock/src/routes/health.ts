import { Hono } from "hono";

export const healthRoutes = new Hono();

type HealthResponse = {
  ok: true;
  service: "twilio-mock";
};

healthRoutes.get("/health", (c) => {
  const body: HealthResponse = { ok: true, service: "twilio-mock" };
  return c.json(body);
});
