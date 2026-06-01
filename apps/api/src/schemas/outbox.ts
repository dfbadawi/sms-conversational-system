import { z } from "zod";

export const outboxEventRowSchema = z
  .object({
    id: z.string(),
    event_type: z.string(),
    aggregate_id: z.string(),
    payload: z.object({
      messageId: z.string(),
    }),
  })
  .transform((row) => ({
    id: row.id,
    eventType: row.event_type,
    aggregateId: row.aggregate_id,
    payload: row.payload,
  }));

export type OutboxEvent = z.output<typeof outboxEventRowSchema>;
