import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { simulateInboundRequestSchema } from "../schemas/simulate";
import { simulateInboundSms } from "../services/simulate-inbound";

export const simulateRoutes = new Hono();

simulateRoutes.post(
  "/simulate/inbound",
  zValidator("json", simulateInboundRequestSchema),
  async (c) => {
    const input = c.req.valid("json");
    const result = await simulateInboundSms(input);

    if (!result.ok) {
      return c.json({ error: result.error }, 502);
    }

    return c.json({
      messageSid: result.messageSid,
      webhookStatus: result.webhookStatus,
      accepted: result.accepted,
    });
  },
);
