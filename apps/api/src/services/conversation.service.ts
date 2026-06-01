import { db } from "../db/client";
import * as conversationRepo from "../repositories/conversation.repository";
import * as outboxRepo from "../repositories/outbox.repository";
import type { ConversationDetail, ConversationSummary } from "@sms/shared";
import { releaseOutboxPublisher } from "./outbox-publisher";

type ReceiveInboundMessageInput = {
  twilioSid: string;
  from: string;
  to: string;
  body: string;
  occurredAt: Date;
};

type ReceiveInboundMessageResult = {
  messageId: string;
  duplicate: boolean;
};

export async function receiveInboundMessage(
  input: ReceiveInboundMessageInput,
): Promise<ReceiveInboundMessageResult> {
  const result = await db.begin(async (tx) => {
    const conversationId = await conversationRepo.upsertConversation(
      tx,
      input.from,
      input.to,
    );

    const messageId = await conversationRepo.insertInboundMessage(tx, {
      conversationId,
      twilioSid: input.twilioSid,
      body: input.body,
      occurredAt: input.occurredAt,
    });

    if (!messageId) {
      const existingId = await conversationRepo.findMessageIdByTwilioSid(
        tx,
        input.twilioSid,
      );

      console.log(
        `[api] inbound duplicate messageSid=${input.twilioSid} messageId=${existingId ?? "unknown"}`,
      );

      return { messageId: existingId ?? "", duplicate: true };
    }

    await outboxRepo.insertMessageReceivedEvent(tx, messageId);

    console.log(
      `[api] inbound stored messageSid=${input.twilioSid} messageId=${messageId} conversationId=${conversationId}`,
    );

    return { messageId, duplicate: false };
  });

  if (!result.duplicate) {
    releaseOutboxPublisher();
  }

  return result;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  return conversationRepo.findConversationSummaries();
}

export async function getConversationById(
  id: string,
): Promise<ConversationDetail | null> {
  const conversation = await conversationRepo.findConversationById(id);
  if (!conversation) {
    return null;
  }

  const messages = await conversationRepo.findMessagesByConversationId(id);
  return { ...conversation, messages };
}
