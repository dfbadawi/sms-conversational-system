import type { SendMessageResponse } from "./schemas/send";

const sendRecords = new Map<string, SendMessageResponse>();

export function getSendRecord(
  idempotencyKey: string,
): SendMessageResponse | undefined {
  return sendRecords.get(idempotencyKey);
}

export function saveSendRecord(
  idempotencyKey: string,
  record: SendMessageResponse,
): void {
  sendRecords.set(idempotencyKey, record);
}

export function listSendRecords(): Array<{
  idempotencyKey: string;
  body: SendMessageResponse;
}> {
  return [...sendRecords.entries()].map(([idempotencyKey, body]) => ({
    idempotencyKey,
    body,
  }));
}

export function clearSendRecords(): void {
  sendRecords.clear();
}
