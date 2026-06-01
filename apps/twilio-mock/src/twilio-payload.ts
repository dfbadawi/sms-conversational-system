export function createMessageSid(prefix = "SM"): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function buildInboundWebhookFields(input: {
  messageSid: string;
  accountSid: string;
  from: string;
  to: string;
  body: string;
  timestamp: string;
}): Record<string, string> {
  return {
    MessageSid: input.messageSid,
    SmsSid: input.messageSid,
    SmsMessageSid: input.messageSid,
    AccountSid: input.accountSid,
    From: input.from,
    To: input.to,
    Body: input.body,
    NumMedia: "0",
    MessageTimestamp: input.timestamp,
  };
}
