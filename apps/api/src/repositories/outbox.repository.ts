import { z } from "zod";
import { db, type SqlClient } from "../db/client";
import {
  outboxEventRowSchema,
  type OutboxEvent,
} from "../schemas/outbox";

export type { OutboxEvent };

export async function insertMessageReceivedEvent(
  tx: SqlClient,
  messageId: string,
): Promise<void> {
  await tx`
    INSERT INTO outbox_events (
      aggregate_type,
      aggregate_id,
      event_type,
      payload
    )
    VALUES (
      'message',
      ${messageId},
      'message.received',
      jsonb_build_object('messageId', ${messageId}::text)
    )
    ON CONFLICT (aggregate_type, aggregate_id, event_type) DO NOTHING
  `;
}

export async function loadUnpublishedEvents(
  limit: number,
): Promise<OutboxEvent[]> {
  return db.begin(async (tx) => {
    const rows = await tx`
      SELECT id, event_type, aggregate_id, payload
      FROM outbox_events
      WHERE published_at IS NULL
      ORDER BY created_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `;

    return z.array(outboxEventRowSchema).parse(rows);
  });
}

export async function markEventPublished(eventId: string): Promise<void> {
  await db`
    UPDATE outbox_events
    SET published_at = now(), last_error = NULL, updated_at = now()
    WHERE id = ${eventId}
  `;
}

export async function markEventFailed(
  eventId: string,
  error: string,
): Promise<void> {
  await db`
    UPDATE outbox_events
    SET attempts = attempts + 1, last_error = ${error}, updated_at = now()
    WHERE id = ${eventId}
  `;
}
