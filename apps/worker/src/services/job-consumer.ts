import {
  processInboundMessageJobSchema,
  type ProcessInboundMessageJob,
} from "@sms/shared";
import { DelayedError, type Job } from "bullmq";
import { markMessagesFailed } from "../repositories/message.repository";
import {
  errorMessage,
  isConversationNotReadyError,
} from "../utils/errors";
import { processInboundMessage } from "./processor";

type SmsJob = Job<ProcessInboundMessageJob>;

const ORDERING_WAIT_DELAY_MS = 2500;

function isFinalAttempt(job: SmsJob): boolean {
  return job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
}

async function handleJobError(job: SmsJob, error: unknown): Promise<never> {
  const messageId = job.data.messageId;
  const finalAttempt = isFinalAttempt(job);

  if (finalAttempt) {
    await markMessagesFailed(messageId, errorMessage(error));
    console.error(
      `[worker] final failure messageId=${messageId} error=${errorMessage(error)}`,
    );
  } else {
    console.error(
      `[worker] job failed messageId=${messageId} error=${errorMessage(error)}`,
    );
  }

  throw error instanceof Error ? error : new Error(errorMessage(error));
}

export async function consumeJob(
  job: SmsJob,
  token?: string,
): Promise<void> {
  const { messageId } = processInboundMessageJobSchema.parse(job.data);
  console.log(`[worker] processing messageId=${messageId}`);

  try {
    await processInboundMessage(messageId);
  } catch (error) {
    if (isConversationNotReadyError(error)) {
      await job.moveToDelayed(Date.now() + ORDERING_WAIT_DELAY_MS, token);
      throw new DelayedError();
    }

    await handleJobError(job, error);
  }
}
