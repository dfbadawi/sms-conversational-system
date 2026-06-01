// After commit, releaseOutboxPublisher() wakes the loop immediately.
// If the wake is missed, the loop sleeps 30 seconds before polling again.

import type { ProcessInboundMessageJob } from "@sms/shared";
import {
  inboundJobId,
  PROCESS_INBOUND_JOB_NAME,
  smsQueue,
} from "../queues/sms.queue";
import * as outboxRepo from "../repositories/outbox.repository";

const BATCH_SIZE = 25;
const FALLBACK_POLL_INTERVAL_MS = 30_000;

let released = false;
let wake: (() => void) | null = null;

export function releaseOutboxPublisher(): void {
  released = true;
  wake?.();
  wake = null;
}

function waitForOutboxRelease(timeoutMs: number): Promise<void> {
  if (released) {
    released = false;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timeout);
      released = false;
      wake = null;
      resolve();
    };

    wake = done;
    const timeout = setTimeout(done, timeoutMs);
  });
}

async function publishEventToQueue(event: outboxRepo.OutboxEvent): Promise<void> {
  // Only message.received events are inserted today.
  const messageId = event.payload.messageId;
  const jobData: ProcessInboundMessageJob = { messageId };
  const jobId = inboundJobId(messageId);

  await smsQueue.add(PROCESS_INBOUND_JOB_NAME, jobData, {
    jobId,
    attempts: 5,
    backoff: { type: "exponential", delay: 2500 },
    removeOnComplete: 1000,
    removeOnFail: false,
  });

  console.log(
    `[outbox-publisher] enqueued messageId=${messageId} eventId=${event.id} jobId=${jobId}`,
  );
}

export async function publishBatch(): Promise<void> {
  const events = await outboxRepo.loadUnpublishedEvents(BATCH_SIZE);
  console.log(`[outbox-publisher] loaded ${events.length} events`);

  for (const event of events) {
    try {
      await publishEventToQueue(event);
      await outboxRepo.markEventPublished(event.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publish failed";
      console.error("[outbox-publisher] failed to publish event:", event.id, message);
      await outboxRepo.markEventFailed(event.id, message);
    }
  }
}

export function startOutboxPublisher(): { stop: () => Promise<void> } {
  let running = true;
  let loopPromise: Promise<void> | null = null;

  const loop = async () => {
    while (running) {
      try {
        await publishBatch();
      } catch (error) {
        console.error("[outbox-publisher] batch error:", error);
      }

      if (!running) {
        break;
      }

      await waitForOutboxRelease(FALLBACK_POLL_INTERVAL_MS);
    }
  };

  loopPromise = loop();

  return {
    async stop() {
      running = false;
      releaseOutboxPublisher();
      if (loopPromise) {
        await loopPromise;
      }
    },
  };
}
