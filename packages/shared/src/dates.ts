import { z } from "zod";

export const dateLikeSchema = z.union([z.date(), z.string()]);

export function toIsoString(date: Date | string): string {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}
