import { delay, getProcessingDelayMs } from "../utils/delay";
import { ConversationNotReadyError } from "../utils/errors";
import * as messageRepo from "../repositories/message.repository";
import { sendSms } from "./twilio.client";

function isTerminalStatus(status: string): boolean {
  return status === "sent" || status === "failed";
}

export async function processInboundMessage(messageId: string): Promise<void> {
  const inbound = await messageRepo.findInboundWithConversation(messageId);

  if (!inbound) {
    throw new Error(`Inbound message not found: ${messageId}`);
  }

  if (isTerminalStatus(inbound.status)) {
    return;
  }

  const earlierPendingId = await messageRepo.findEarlierPendingInboundId(
    inbound.conversationId,
    inbound.occurredAt,
    inbound.id,
  );

  if (earlierPendingId) {
    console.log(
      `[worker] conversation not ready messageId=${messageId} waitingOn=${earlierPendingId}`,
    );
    throw new ConversationNotReadyError(messageId);
  }

  let outbound = await messageRepo.findOutboundByReplyTo(inbound.id);
  if (outbound?.twilioSid) {
    console.log(
      `[worker] reply already sent messageId=${messageId} outboundMessageId=${outbound.id} twilioSid=${outbound.twilioSid}`,
    );
    await messageRepo.markReplySent(inbound.id, outbound.id, outbound.twilioSid);
    return;
  }

  const processingInbound = await messageRepo.markInboundProcessing(messageId);
  if (!processingInbound) {
    if (isTerminalStatus(inbound.status)) {
      return;
    }

    throw new Error(`Unable to mark message ${messageId} as processing`);
  }

  if (!outbound) {
    const delayMs = getProcessingDelayMs();
    console.log(`[worker] generating reply messageId=${messageId} delayMs=${delayMs}`);

    await delay(delayMs);

    const replyBody = `Thanks for your message: ${processingInbound.body}`;

    outbound = await messageRepo.createOrReuseOutboundMessage({
      conversationId: processingInbound.conversationId,
      body: replyBody,
      inReplyToMessageId: processingInbound.id,
    });

    console.log(
      `[worker] reply ready messageId=${messageId} outboundMessageId=${outbound.id}`,
    );
  } else {
    console.log(
      `[worker] reusing existing outbound messageId=${messageId} outboundMessageId=${outbound.id} status=${outbound.status}`,
    );
  }

  console.log(
    `[worker] sending sms messageId=${messageId} outboundMessageId=${outbound.id} to=${processingInbound.phoneFrom}`,
  );

  const twilioResult = await sendSms({
    from: processingInbound.phoneTo,
    to: processingInbound.phoneFrom,
    body: outbound.body,
    idempotencyKey: `outbound:${outbound.id}`,
  });

  await messageRepo.markReplySent(
    processingInbound.id,
    outbound.id,
    twilioResult.twilioSid,
  );

  console.log(
    `[worker] sent outboundMessageId=${outbound.id} twilioSid=${twilioResult.twilioSid}`,
  );
}
