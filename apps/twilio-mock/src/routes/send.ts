import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import {
  idempotencyKeyHeaderSchema,
  sendMessageBodySchema,
} from "../schemas/send";
import {
  clearMockOutboundSends,
  listMockOutboundSends,
  sendOutboundMessage,
} from "../services/send-message";

export const sendRoutes = new Hono();

sendRoutes.post(
  "/2010-04-01/Accounts/:accountSid/Messages",
  zValidator("header", idempotencyKeyHeaderSchema),
  zValidator("form", sendMessageBodySchema),
  (c) => {
    const fields = c.req.valid("form");
    const idempotencyKey = c.req.valid("header")["idempotency-key"];
    const body = sendOutboundMessage({ idempotencyKey, fields });
    return c.json(body, 201);
  },
);

sendRoutes.get("/mock/sends", (c) => c.json(listMockOutboundSends()));

sendRoutes.delete("/mock/sends", (c) => {
  clearMockOutboundSends();
  return c.json({ cleared: true });
});
