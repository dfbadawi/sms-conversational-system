import { z } from "zod";

export const idempotencyKeyHeaderSchema = z.object({
  "idempotency-key": z.string().min(1),
});

export const sendMessageBodySchema = z.object({
  From: z.string(),
  To: z.string(),
  Body: z.string(),
});

export type SendMessageBody = z.infer<typeof sendMessageBodySchema>;
export type SendMessageResponse = {
  sid: string;
  account_sid: string;
  from: string;
  to: string;
  body: string;
  status: "queued";
};
