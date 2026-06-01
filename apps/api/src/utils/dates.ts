export function parseTwilioTimestamp(value: string | undefined): Date {
  // Use server time when Twilio omits MessageTimestamp.
  if (!value) {
    return new Date();
  }

  return new Date(value);
}
