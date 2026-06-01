import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { twilioWebhookBodySchema } from "../schemas/webhook";
import { receiveInboundMessage } from "../services/conversation.service";
import { parseTwilioTimestamp } from "../utils/dates";

export const webhookRoutes = new Hono();

webhookRoutes.post(
  "/webhook/twilio",
  zValidator("form", twilioWebhookBodySchema),
  async (c) => {
    const body = c.req.valid("form");
    await receiveInboundMessage({
      twilioSid: body.MessageSid,
      from: body.From,
      to: body.To,
      body: body.Body,
      occurredAt: parseTwilioTimestamp(body.MessageTimestamp),
    });
    return c.json({ ok: true });
  },
);
