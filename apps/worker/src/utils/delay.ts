import { env } from "../env";

export function getProcessingDelayMs(): number {
  if (env.testProcessingDelayMs !== undefined) {
    return env.testProcessingDelayMs;
  }

  const min = env.processingDelayMinMs;
  const max = env.processingDelayMaxMs;
  const upper = Math.max(min, max);

  return min + Math.floor(Math.random() * (upper - min + 1));
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
