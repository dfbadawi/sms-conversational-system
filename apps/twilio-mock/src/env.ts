import { readPort } from "@sms/shared";

export const env = {
  port: readPort("TWILIO_MOCK_PORT", 3002),
  apiWebhookUrl:
    Bun.env.API_WEBHOOK_URL ?? "http://localhost:3000/webhook/twilio",
  corsOrigin: Bun.env.CORS_ORIGIN ?? "http://localhost:5173",
  twilioAccountSid: Bun.env.TWILIO_ACCOUNT_SID ?? "AC_mock_account",
  twilioFromNumber: Bun.env.TWILIO_FROM_NUMBER ?? "+15551230000",
};
