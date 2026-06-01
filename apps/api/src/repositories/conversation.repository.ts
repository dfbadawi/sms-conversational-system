import { z } from "zod";
import {
  conversationRowSchema,
  conversationSummaryRowSchema,
  messageRowSchema,
  type ConversationHeader,
  type ConversationSummary,
  type MessageDto,
} from "@sms/shared";
import { db } from "../db/client";
import type { SqlClient } from "../db/client";

export type InsertInboundMessageInput = {
  conversationId: string;
  twilioSid: string;
  body: string;
  occurredAt: Date;
};

export async function upsertConversation(
  tx: SqlClient,
  phoneFrom: string,
  phoneTo: string,
): Promise<string> {
  const rows = (await tx`
    INSERT INTO conversations (phone_from, phone_to, updated_at)
    VALUES (${phoneFrom}, ${phoneTo}, now())
    ON CONFLICT (phone_from, phone_to)
    DO UPDATE SET updated_at = now()
    RETURNING id
  `) as Array<{ id: string }>;

  return rows[0]!.id;
}

export async function insertInboundMessage(
  tx: SqlClient,
  input: InsertInboundMessageInput,
): Promise<string | null> {
  const rows = (await tx`
    INSERT INTO messages (
      conversation_id,
      twilio_sid,
      direction,
      body,
      status,
      occurred_at
    )
    VALUES (
      ${input.conversationId},
      ${input.twilioSid},
      'inbound',
      ${input.body},
      'received',
      ${input.occurredAt}
    )
    ON CONFLICT (twilio_sid) DO NOTHING
    RETURNING id
  `) as Array<{ id: string }>;

  return rows[0]?.id ?? null;
}

export async function findMessageIdByTwilioSid(
  tx: SqlClient,
  twilioSid: string,
): Promise<string | null> {
  const rows = (await tx`
    SELECT id
    FROM messages
    WHERE twilio_sid = ${twilioSid}
  `) as Array<{ id: string }>;

  return rows[0]?.id ?? null;
}

export async function findConversationSummaries(): Promise<ConversationSummary[]> {
  const rows = await db`
    SELECT
      c.id,
      c.phone_from,
      c.phone_to,
      c.updated_at,
      m.body AS last_message_body,
      m.status AS last_message_status
    FROM conversations c
    LEFT JOIN LATERAL (
      SELECT body, status
      FROM messages
      WHERE conversation_id = c.id
      ORDER BY occurred_at DESC, id DESC
      LIMIT 1
    ) m ON true
    ORDER BY c.updated_at DESC
  `;

  return z.array(conversationSummaryRowSchema).parse(rows);
}

export async function findConversationById(
  id: string,
): Promise<ConversationHeader | null> {
  const rows = await db`
    SELECT id, phone_from, phone_to, created_at, updated_at
    FROM conversations
    WHERE id = ${id}
  `;

  const parsed = z.array(conversationRowSchema).parse(rows);
  return parsed[0] ?? null;
}

export async function findMessagesByConversationId(
  conversationId: string,
): Promise<MessageDto[]> {
  const rows = await db`
    SELECT
      id,
      conversation_id,
      twilio_sid,
      direction,
      body,
      status,
      in_reply_to_message_id,
      occurred_at,
      last_error
    FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY occurred_at ASC, id ASC
  `;

  return z.array(messageRowSchema).parse(rows);
}
