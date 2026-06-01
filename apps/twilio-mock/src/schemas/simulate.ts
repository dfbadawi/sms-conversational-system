import { z } from "zod";

export const simulateInboundRequestSchema = z.object({
  from: z.string().min(1),
  body: z.string().min(1),
  to: z.string().min(1).optional(),
  messageSid: z.string().min(1).optional(),
  timestamp: z.string().min(1).optional(),
});

export type SimulateInboundRequest = z.infer<typeof simulateInboundRequestSchema>;
export type SimulateInboundResponse = {
  messageSid: string;
  webhookStatus: number;
  accepted: boolean;
};
