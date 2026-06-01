import { env } from "../env";
import type { SimulateInboundRequest } from "../schemas/simulate";
import {
  buildInboundWebhookFields,
  createMessageSid,
} from "../twilio-payload";

export type SimulateInboundSuccess = {
  ok: true;
  messageSid: string;
  webhookStatus: number;
  accepted: boolean;
};

export type SimulateInboundFailure = {
  ok: false;
  error: string;
};

export type SimulateInboundResult =
  | SimulateInboundSuccess
  | SimulateInboundFailure;

export async function simulateInboundSms(
  input: SimulateInboundRequest,
): Promise<SimulateInboundResult> {
  const to = input.to ?? env.twilioFromNumber;
  const messageSid = input.messageSid ?? createMessageSid();
  const timestamp = input.timestamp ?? new Date().toISOString();

  const fields = buildInboundWebhookFields({
    messageSid,
    accountSid: env.twilioAccountSid,
    from: input.from,
    to,
    body: input.body,
    timestamp,
  });

  const formBody = new URLSearchParams(fields);

  console.log(
    `[twilio-mock] simulate inbound messageSid=${messageSid} from=${input.from} to=${to} body=${input.body}`,
  );

  try {
    console.log(
      `[twilio-mock] posting webhook messageSid=${messageSid} url=${env.apiWebhookUrl}`,
    );

    const started = performance.now();
    const response = await fetch(env.apiWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
      signal: AbortSignal.timeout(4000),
    });

    const webhookStatus = response.status;
    const accepted = webhookStatus >= 200 && webhookStatus < 300;

    const responseMs = Math.round(performance.now() - started);
    console.log(
      `[twilio-mock] webhook response messageSid=${messageSid} status=${webhookStatus} accepted=${accepted} responseMs=${responseMs}`,
    );

    return {
      ok: true,
      messageSid,
      webhookStatus,
      accepted,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook request failed";
    console.error("[twilio-mock] inbound webhook failed:", message);

    return { ok: false, error: message };
  }
}
