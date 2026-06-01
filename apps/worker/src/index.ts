import { Worker } from "bullmq";
import type { ProcessInboundMessageJob } from "@sms/shared";
import { closeDb } from "./db/client";
import { env } from "./env";
import {
  parseRedisConnection,
  SMS_QUEUE_NAME,
} from "./queues/sms.queue";
import { consumeJob } from "./services/job-consumer";

const processingDelay = env.testProcessingDelayMs !== undefined
  ? `testOverride=${env.testProcessingDelayMs}ms`
  : `range=${env.processingDelayMinMs}-${env.processingDelayMaxMs}ms`;

const smsConsumer = new Worker<ProcessInboundMessageJob>(
  SMS_QUEUE_NAME,
  consumeJob,
  {
    connection: parseRedisConnection(env.redisUrl),
    concurrency: env.workerConcurrency,
  },
);

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] received ${signal}, shutting down`);
  await smsConsumer.close();
  await closeDb();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

console.log(
  `[worker] started pid=${process.pid} concurrency=${env.workerConcurrency} queue=${SMS_QUEUE_NAME} twilioBaseUrl=${env.twilioBaseUrl} processingDelay=${processingDelay}`,
);
