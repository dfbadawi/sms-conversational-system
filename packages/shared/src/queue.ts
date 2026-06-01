import { z } from "zod";

export const SMS_QUEUE_NAME = "sms-processing";
export const PROCESS_INBOUND_JOB_NAME = "process-inbound-message";

export function inboundJobId(messageId: string): string {
  return `inbound-${messageId}`;
}

export function parseRedisConnection(redisUrl: string) {
  const parsed = new URL(redisUrl);
  const connection: {
    host: string;
    port: number;
    password?: string;
    username?: string;
  } = {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
  };

  if (parsed.password) {
    connection.password = decodeURIComponent(parsed.password);
  }

  if (parsed.username) {
    connection.username = decodeURIComponent(parsed.username);
  }

  return connection;
}

export const processInboundMessageJobSchema = z.object({
  messageId: z.uuid(),
});

export type ProcessInboundMessageJob = z.infer<
  typeof processInboundMessageJobSchema
>;
