import { Queue } from "bullmq";
import {
  inboundJobId,
  parseRedisConnection,
  PROCESS_INBOUND_JOB_NAME,
  SMS_QUEUE_NAME,
} from "@sms/shared";
import { env } from "../env";

export { inboundJobId, PROCESS_INBOUND_JOB_NAME, SMS_QUEUE_NAME };

export const smsQueue = new Queue(SMS_QUEUE_NAME, {
  connection: parseRedisConnection(env.redisUrl),
});

export async function closeSmsQueue(): Promise<void> {
  await smsQueue.close();
}
