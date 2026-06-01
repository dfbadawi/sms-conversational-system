import { z } from "zod";
import { dateLikeSchema, toIsoString } from "./dates";

export const messageDirectionSchema = z.enum(["inbound", "outbound"]);
export type MessageDirection = z.infer<typeof messageDirectionSchema>;

export const messageStatusSchema = z.enum([
  "received",
  "processing",
  "sent",
  "failed",
]);
export type MessageStatus = z.infer<typeof messageStatusSchema>;

export const messageRowSchema = z
  .object({
    id: z.string(),
    conversation_id: z.string(),
    twilio_sid: z.string().nullable(),
    direction: messageDirectionSchema,
    body: z.string(),
    status: messageStatusSchema,
    in_reply_to_message_id: z.string().nullable(),
    occurred_at: dateLikeSchema,
    last_error: z.string().nullable(),
  })
  .transform((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    twilioSid: row.twilio_sid,
    direction: row.direction,
    body: row.body,
    status: row.status,
    inReplyToMessageId: row.in_reply_to_message_id,
    occurredAt: toIsoString(row.occurred_at),
    lastError: row.last_error,
  }));

export type MessageDto = z.output<typeof messageRowSchema>;

export const conversationSummaryRowSchema = z
  .object({
    id: z.string(),
    phone_from: z.string(),
    phone_to: z.string(),
    updated_at: dateLikeSchema,
    last_message_body: z.string().nullable(),
    last_message_status: messageStatusSchema.nullable(),
  })
  .transform((row) => ({
    id: row.id,
    phoneFrom: row.phone_from,
    phoneTo: row.phone_to,
    lastMessageBody: row.last_message_body,
    lastMessageStatus: row.last_message_status,
    updatedAt: toIsoString(row.updated_at),
  }));

export type ConversationSummary = z.output<typeof conversationSummaryRowSchema>;

export const conversationRowSchema = z
  .object({
    id: z.string(),
    phone_from: z.string(),
    phone_to: z.string(),
    created_at: dateLikeSchema,
    updated_at: dateLikeSchema,
  })
  .transform((row) => ({
    id: row.id,
    phoneFrom: row.phone_from,
    phoneTo: row.phone_to,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }));

export type ConversationHeader = z.output<typeof conversationRowSchema>;

export type ConversationDetail = ConversationHeader & {
  messages: MessageDto[];
};
