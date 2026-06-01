import type {
  ConversationDetail,
  ConversationSummary,
} from "@sms/shared";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) {
      return `${response.status}: ${body.error}`;
    }
  } catch {
    // ignore JSON parse errors
  }

  return `${response.status}: ${response.statusText || "Request failed"}`;
}

async function fetchJson<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<T>;
}

export async function listConversations(
  signal?: AbortSignal,
): Promise<ConversationSummary[]> {
  return fetchJson<ConversationSummary[]>("/conversations", signal);
}

export async function getConversation(
  id: string,
  signal?: AbortSignal,
): Promise<ConversationDetail> {
  return fetchJson<ConversationDetail>(`/conversations/${id}`, signal);
}

export { parseError };
