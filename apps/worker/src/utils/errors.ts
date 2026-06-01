export class ConversationNotReadyError extends Error {
  constructor(messageId: string) {
    super(`Conversation not ready for message ${messageId}`);
    this.name = "ConversationNotReadyError";
  }
}

export function isConversationNotReadyError(
  error: unknown,
): error is ConversationNotReadyError {
  return error instanceof ConversationNotReadyError;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
