import { z } from "zod";
import { db } from "../db/client";
import {
  inboundMessageRowSchema,
  outboundMessageRowSchema,
  type InboundMessage,
  type OutboundMessage,
} from "../schemas/message";

export type CreateOutboundMessageInput = {
  conversationId: string;
  body: string;
  inReplyToMessageId: string;
};

export async function findInboundWithConversation(
  messageId: string,
): Promise<InboundMessage | null> {
  const rows = await db`
    SELECT
      m.id,
      m.body,
      m.status,
      m.occurred_at,
      m.conversation_id,
      c.phone_from,
      c.phone_to
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = ${messageId}
      AND m.direction = 'inbound'
  `;

  const parsed = z.array(inboundMessageRowSchema).parse(rows);
  return parsed[0] ?? null;
}

export async function findEarlierPendingInboundId(
  conversationId: string,
  occurredAt: Date | string,
  messageId: string,
): Promise<string | null> {
  const rows = (await db`
    SELECT id
    FROM messages
    WHERE conversation_id = ${conversationId}
      AND direction = 'inbound'
      AND status IN ('received', 'processing')
      AND (occurred_at, id) < (${occurredAt}, ${messageId})
    LIMIT 1
  `) as Array<{ id: string }>;

  return rows[0]?.id ?? null;
}

export async function markInboundProcessing(
  messageId: string,
): Promise<InboundMessage | null> {
  const rows = await db`
    UPDATE messages AS m
    SET
      status = 'processing',
      processing_attempts = m.processing_attempts + 1,
      updated_at = now()
    FROM conversations AS c
    WHERE m.id = ${messageId}
      AND m.conversation_id = c.id
      AND m.direction = 'inbound'
      AND m.status IN ('received', 'processing')
    RETURNING
      m.id,
      m.body,
      m.status,
      m.occurred_at,
      m.conversation_id,
      c.phone_from,
      c.phone_to
  `;

  const parsed = z.array(inboundMessageRowSchema).parse(rows);
  return parsed[0] ?? null;
}

export async function createOrReuseOutboundMessage(
  input: CreateOutboundMessageInput,
): Promise<OutboundMessage> {
  const rows = await db`
    INSERT INTO messages (
      conversation_id,
      direction,
      body,
      status,
      in_reply_to_message_id,
      occurred_at
    )
    VALUES (
      ${input.conversationId},
      'outbound',
      ${input.body},
      'processing',
      ${input.inReplyToMessageId},
      now()
    )
    ON CONFLICT (in_reply_to_message_id)
    DO UPDATE SET updated_at = messages.updated_at
    RETURNING id, body, twilio_sid, status
  `;

  const parsed = z.array(outboundMessageRowSchema).parse(rows);
  return parsed[0]!;
}

export async function findOutboundByReplyTo(
  inboundMessageId: string,
): Promise<OutboundMessage | null> {
  const rows = await db`
    SELECT id, body, twilio_sid, status
    FROM messages
    WHERE in_reply_to_message_id = ${inboundMessageId}
  `;

  const parsed = z.array(outboundMessageRowSchema).parse(rows);
  return parsed[0] ?? null;
}

export async function markReplySent(
  inboundMessageId: string,
  outboundMessageId: string,
  twilioSid: string,
): Promise<void> {
  await db.begin(async (tx) => {
    await tx`
      UPDATE messages
      SET twilio_sid = ${twilioSid}, updated_at = now()
      WHERE id = ${outboundMessageId}
    `;

    await tx`
      UPDATE messages
      SET status = 'sent', last_error = NULL, updated_at = now()
      WHERE id IN (${inboundMessageId}, ${outboundMessageId})
    `;
  });
}

export async function markMessagesFailed(
  inboundMessageId: string,
  lastError: string,
): Promise<void> {
  const outbound = await findOutboundByReplyTo(inboundMessageId);

  if (outbound) {
    await db`
      UPDATE messages
      SET status = 'failed', last_error = ${lastError}, updated_at = now()
      WHERE id IN (${inboundMessageId}, ${outbound.id})
    `;
    return;
  }

  await db`
    UPDATE messages
    SET status = 'failed', last_error = ${lastError}, updated_at = now()
    WHERE id = ${inboundMessageId}
  `;
}
