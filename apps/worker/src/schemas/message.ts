import { dateLikeSchema } from "@sms/shared";
import { z } from "zod";
import { messageStatusSchema } from "@sms/shared";

export const inboundMessageRowSchema = z
  .object({
    id: z.string(),
    body: z.string(),
    status: messageStatusSchema,
    occurred_at: dateLikeSchema,
    conversation_id: z.string(),
    phone_from: z.string(),
    phone_to: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    body: row.body,
    status: row.status,
    occurredAt: row.occurred_at,
    conversationId: row.conversation_id,
    phoneFrom: row.phone_from,
    phoneTo: row.phone_to,
  }));

export type InboundMessage = z.output<typeof inboundMessageRowSchema>;

export const outboundMessageRowSchema = z
  .object({
    id: z.string(),
    body: z.string(),
    twilio_sid: z.string().nullable(),
    status: messageStatusSchema,
  })
  .transform((row) => ({
    id: row.id,
    body: row.body,
    twilioSid: row.twilio_sid,
    status: row.status,
  }));

export type OutboundMessage = z.output<typeof outboundMessageRowSchema>;
