import { env } from "../env";

export type SendSmsInput = {
  from: string;
  to: string;
  body: string;
  idempotencyKey: string;
};

export type SendSmsResult = {
  twilioSid: string;
};

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const url = `${env.twilioBaseUrl}/2010-04-01/Accounts/${env.twilioAccountSid}/Messages`;
  const form = new URLSearchParams({
    From: input.from,
    To: input.to,
    Body: input.body,
  });

  console.log(
    `[worker] calling twilio send idempotencyKey=${input.idempotencyKey} url=${url}`,
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: form.toString(),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const responseText = await response.text();
    console.error(
      `[worker] twilio send failed url=${url} status=${response.status}: ${responseText}`,
    );
    throw new Error(
      `Twilio send failed with status ${response.status}: ${responseText}`,
    );
  }

  const payload = (await response.json()) as { sid?: string };
  if (!payload.sid) {
    throw new Error("Twilio send response missing sid");
  }

  return { twilioSid: payload.sid };
}
