import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL } from "bun";
import { Hono } from "hono";
import type { ConversationDetail, ConversationSummary } from "@sms/shared";
import { applyMigrations } from "../../src/db/migrate";
import { closeDb as closeApiDb } from "../../src/db/client";
import { env } from "../../src/env";
import { closeSmsQueue, inboundJobId, smsQueue } from "../../src/queues/sms.queue";
import { conversationsRoutes } from "../../src/routes/conversations";
import { webhookRoutes } from "../../src/routes/webhook";
import { publishBatch } from "../../src/services/outbox-publisher";
import { closeDb as closeWorkerDb } from "../../../worker/src/db/client";
import { env as workerEnv } from "../../../worker/src/env";
import { processInboundMessage } from "../../../worker/src/services/processor";

type StoredMessage = {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: "received" | "processing" | "sent" | "failed";
  twilio_sid: string | null;
  in_reply_to_message_id: string | null;
  last_error: string | null;
};

type MockOutboundSend = {
  idempotencyKey: string;
  body: {
    sid: string;
    account_sid: string;
    from: string;
    to: string;
    body: string;
    status: "queued";
  };
};

const testDb = new SQL(env.databaseUrl);
const hasDatabase = await testDb`SELECT 1 AS ok`
  .then(() => true)
  .catch(() => false);

const hasRedis = await smsQueue
  .getJobCounts()
  .then(() => true)
  .catch(() => false);

const hasTwilio = await fetch(`${workerEnv.twilioBaseUrl}/health`)
  .then((response) => response.ok)
  .catch(() => false);

if (!hasDatabase || !hasRedis || !hasTwilio) {
  await Promise.allSettled([
    closeSmsQueue(),
    closeApiDb(),
    closeWorkerDb(),
    testDb.close(),
  ]);
}

const describeIfInfra = hasDatabase && hasRedis && hasTwilio ? describe : describe.skip;

const app = new Hono();
app.route("/", webhookRoutes);
app.route("/", conversationsRoutes);

const uniqueSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
const messageSid = `SM_full_workflow_${uniqueSuffix}`;
const phoneFrom = `+5511${uniqueSuffix.slice(0, 8)}`;
const phoneTo = "+15551230000";
const inboundBody = "hello full workflow";
const replyBody = `Thanks for your message: ${inboundBody}`;

async function clearTwilioSends(): Promise<void> {
  const response = await fetch(`${workerEnv.twilioBaseUrl}/mock/sends`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Unable to clear Twilio sends: ${response.status}`);
  }
}

async function listTwilioSends(): Promise<MockOutboundSend[]> {
  const response = await fetch(`${workerEnv.twilioBaseUrl}/mock/sends`);

  if (!response.ok) {
    throw new Error(`Unable to list Twilio sends: ${response.status}`);
  }

  return (await response.json()) as MockOutboundSend[];
}

async function loadStoredMessages(conversationId: string): Promise<StoredMessage[]> {
  return (await testDb`
    SELECT
      id,
      conversation_id,
      direction,
      body,
      status,
      twilio_sid,
      in_reply_to_message_id,
      last_error
    FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY occurred_at ASC, id ASC
  `) as StoredMessage[];
}

describeIfInfra("full SMS workflow integration", () => {
  beforeAll(async () => {
    workerEnv.testProcessingDelayMs = 1;
    await applyMigrations(testDb);
    await smsQueue.drain(true);
    await smsQueue.pause();
    await clearTwilioSends();
  });

  afterAll(async () => {
    await Promise.allSettled([smsQueue.drain(true)]);

    await testDb`DELETE FROM outbox_events WHERE aggregate_id IN (
      SELECT id
      FROM messages
      WHERE conversation_id IN (
        SELECT id FROM conversations WHERE phone_from = ${phoneFrom} AND phone_to = ${phoneTo}
      )
    )`;
    await testDb`DELETE FROM messages WHERE conversation_id IN (
      SELECT id FROM conversations WHERE phone_from = ${phoneFrom} AND phone_to = ${phoneTo}
    )`;
    await testDb`DELETE FROM conversations WHERE phone_from = ${phoneFrom} AND phone_to = ${phoneTo}`;
    await clearTwilioSends();

    await Promise.allSettled([
      smsQueue.resume(),
      closeSmsQueue(),
      closeApiDb(),
      closeWorkerDb(),
      testDb.close(),
    ]);
  });

  test("receives an SMS, queues it, sends the generated reply, and exposes the conversation", async () => {
    const webhookResponse = await app.request("/webhook/twilio", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        MessageSid: messageSid,
        From: phoneFrom,
        To: phoneTo,
        Body: inboundBody,
        MessageTimestamp: "2026-05-31T20:31:00.000Z",
      }),
    });

    expect(webhookResponse.status).toBe(200);
    expect(await webhookResponse.json()).toEqual({ ok: true });

    const inbound = (
      (await testDb`
        SELECT
          m.id,
          m.conversation_id,
          m.direction,
          m.body,
          m.status,
          m.twilio_sid,
          m.in_reply_to_message_id,
          m.last_error
        FROM messages m
        WHERE m.twilio_sid = ${messageSid}
      `) as StoredMessage[]
    )[0];

    expect(inbound).toMatchObject({
      direction: "inbound",
      body: inboundBody,
      status: "received",
      twilio_sid: messageSid,
    });

    const outboxBeforePublish = (
      (await testDb`
        SELECT event_type, payload, published_at
        FROM outbox_events
        WHERE aggregate_id = ${inbound.id}
      `) as Array<{
        event_type: string;
        payload: { messageId: string };
        published_at: Date | null;
      }>
    )[0];

    expect(outboxBeforePublish).toMatchObject({
      event_type: "message.received",
      payload: { messageId: inbound.id },
      published_at: null,
    });

    await publishBatch();

    const job = await smsQueue.getJob(inboundJobId(inbound.id));
    expect(job?.data).toEqual({ messageId: inbound.id });

    await processInboundMessage(job!.data.messageId);

    const storedMessages = await loadStoredMessages(inbound.conversation_id);

    expect(storedMessages[0]).toMatchObject({
      id: inbound.id,
      direction: "inbound",
      status: "sent",
      last_error: null,
    });
    expect(storedMessages[1]).toMatchObject({
      direction: "outbound",
      body: replyBody,
      status: "sent",
      in_reply_to_message_id: inbound.id,
      last_error: null,
    });
    expect(storedMessages[1]?.twilio_sid).toMatch(/^SM_/);

    const twilioSends = await listTwilioSends();
    const outboundSend = twilioSends.find(
      (send) => send.body.sid === storedMessages[1]?.twilio_sid,
    );

    expect(outboundSend).toMatchObject({
      idempotencyKey: `outbound:${storedMessages[1]!.id}`,
      body: {
        account_sid: workerEnv.twilioAccountSid,
        from: phoneTo,
        to: phoneFrom,
        body: replyBody,
        status: "queued",
      },
    });

    const outboxAfterPublish = (
      (await testDb`
        SELECT published_at, last_error
        FROM outbox_events
        WHERE aggregate_id = ${inbound.id}
      `) as Array<{ published_at: Date | null; last_error: string | null }>
    )[0];

    expect(outboxAfterPublish?.published_at).toBeTruthy();
    expect(outboxAfterPublish?.last_error).toBeNull();

    const listResponse = await app.request("/conversations");
    expect(listResponse.status).toBe(200);
    const conversations = (await listResponse.json()) as ConversationSummary[];
    const summary = conversations.find((item) => item.id === inbound.conversation_id);
    expect(summary).toMatchObject({
      phoneFrom,
      phoneTo,
      lastMessageBody: replyBody,
      lastMessageStatus: "sent",
    });

    const detailResponse = await app.request(
      `/conversations/${inbound.conversation_id}`,
    );
    expect(detailResponse.status).toBe(200);
    const detail = (await detailResponse.json()) as ConversationDetail;

    expect(detail.id).toBe(inbound.conversation_id);
    expect(
      detail.messages.map((message) => ({
        direction: message.direction,
        body: message.body,
        status: message.status,
        inReplyToMessageId: message.inReplyToMessageId,
      })),
    ).toEqual([
      {
        direction: "inbound",
        body: inboundBody,
        status: "sent",
        inReplyToMessageId: null,
      },
      {
        direction: "outbound",
        body: replyBody,
        status: "sent",
        inReplyToMessageId: inbound.id,
      },
    ]);
  });
});
