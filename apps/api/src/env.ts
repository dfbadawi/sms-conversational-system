import { readPort } from "@sms/shared";

export const env = {
  port: readPort("API_PORT", 3000),
  databaseUrl:
    Bun.env.DATABASE_URL ??
    "postgres://sms:sms@localhost:5432/sms_system",
  redisUrl: Bun.env.REDIS_URL ?? "redis://localhost:6379",
  corsOrigin: Bun.env.CORS_ORIGIN ?? "http://localhost:5173",
};
