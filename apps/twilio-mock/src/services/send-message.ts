import { env } from "../env";
import type { SendMessageBody, SendMessageResponse } from "../schemas/send";
import {
  clearSendRecords,
  getSendRecord,
  listSendRecords,
  saveSendRecord,
} from "../send-store";
import { createMessageSid } from "../twilio-payload";

export function sendOutboundMessage(input: {
  idempotencyKey: string;
  fields: SendMessageBody;
}): SendMessageResponse {
  const existing = getSendRecord(input.idempotencyKey);

  if (existing) {
    console.log(
      `[twilio-mock] replay outbound sid=${existing.sid} idempotencyKey=${input.idempotencyKey}`,
    );
    return existing;
  }

  const body: SendMessageResponse = {
    sid: createMessageSid(),
    account_sid: env.twilioAccountSid,
    from: input.fields.From,
    to: input.fields.To,
    body: input.fields.Body,
    status: "queued",
  };

  console.log(
    `[twilio-mock] send outbound sid=${body.sid} idempotencyKey=${input.idempotencyKey} from=${body.from} to=${body.to}`,
  );
  saveSendRecord(input.idempotencyKey, body);

  return body;
}

export function listMockOutboundSends() {
  return listSendRecords();
}

export function clearMockOutboundSends() {
  clearSendRecords();
}
