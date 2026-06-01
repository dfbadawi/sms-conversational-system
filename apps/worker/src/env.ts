import {
  readOptionalPositiveInt,
  readPort,
  readPositiveInt,
} from "@sms/shared";

export const env = {
  databaseUrl:
    Bun.env.DATABASE_URL ??
    "postgres://sms:sms@localhost:5432/sms_system",
  redisUrl: Bun.env.REDIS_URL ?? "redis://localhost:6379",
  twilioBaseUrl:
    Bun.env.TWILIO_BASE_URL ?? "http://localhost:3002",
  twilioAccountSid: Bun.env.TWILIO_ACCOUNT_SID ?? "AC_mock_account",
  processingDelayMinMs: readPositiveInt("PROCESSING_DELAY_MIN_MS", 3000),
  processingDelayMaxMs: readPositiveInt("PROCESSING_DELAY_MAX_MS", 15000),
  testProcessingDelayMs: readOptionalPositiveInt("TEST_PROCESSING_DELAY_MS"),
  workerConcurrency: readPositiveInt("WORKER_CONCURRENCY", 5),
};
