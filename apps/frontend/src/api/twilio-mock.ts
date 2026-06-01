import type { SimulateInboundResponse } from "@sms/shared";
import { parseError } from "./client";

const TWILIO_MOCK_BASE_URL =
  import.meta.env.VITE_TWILIO_MOCK_BASE_URL ?? "http://localhost:3002";

export async function simulateInboundSms(
  from: string,
  body: string,
): Promise<SimulateInboundResponse> {
  const response = await fetch(`${TWILIO_MOCK_BASE_URL}/simulate/inbound`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, body }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<SimulateInboundResponse>;
}
