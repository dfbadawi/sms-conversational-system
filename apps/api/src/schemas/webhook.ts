import { z } from "zod";

export const twilioWebhookBodySchema = z.object({
  MessageSid: z.string().min(1),
  From: z.string().min(1),
  To: z.string().min(1),
  Body: z.string(),
  MessageTimestamp: z.string().optional(),
});

export type TwilioWebhookBody = z.infer<typeof twilioWebhookBodySchema>;
