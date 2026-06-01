import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { ConversationDetail, ConversationSummary } from "@sms/shared";
import { getConversation, listConversations } from "./api/client";
import { simulateInboundSms } from "./api/twilio-mock";
import { ConversationDetailPanel } from "./ConversationDetail";
import { ConversationList } from "./ConversationList";

export function App() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState("+5511999999999");
  const [body, setBody] = useState("hello");
  const [simulateFeedback, setSimulateFeedback] = useState<string | null>(null);

  const refreshInFlight = useRef(false);

  const refresh = useCallback(
    async (signal: AbortSignal) => {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;

      try {
        setConversations(await listConversations(signal));
        setError(null);
        if (selectedId) {
          setDetail(await getConversation(selectedId, signal));
        }
      } catch (err) {
        if (!signal.aborted) {
          setError("Could not refresh. Retrying…");
          console.error(err);
        }
      } finally {
        refreshInFlight.current = false;
        setLoading(false);
      }
    },
    [selectedId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const id = window.setInterval(() => void refresh(controller.signal), 3000);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [refresh]);

  async function onSimulate(e: FormEvent) {
    e.preventDefault();
    setSimulateFeedback(null);
    try {
      const result = await simulateInboundSms(from, body);
      setSimulateFeedback(
        result.accepted
          ? `Accepted by webhook (${result.messageSid}).`
          : `Webhook returned ${result.webhookStatus}.`,
      );
    } catch (err) {
      setSimulateFeedback(err instanceof Error ? err.message : "Failed.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 font-sans text-sm text-neutral-900">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold">SMS Admin</h1>
        {loading ? <span className="text-neutral-500">Loading…</span> : null}
      </header>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[minmax(0,330px)_1fr]">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <ConversationDetailPanel conversation={detail} />
      </div>

      <form
        onSubmit={onSimulate}
        className="flex flex-wrap items-end gap-3 rounded border border-dashed border-neutral-300 bg-neutral-50 p-3"
      >
        <label className="flex flex-col gap-1">
          <span className="text-neutral-600">From</span>
          <input
            className="rounded border border-neutral-300 px-2 py-1"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-600">Body</span>
          <input
            className="min-w-48 rounded border border-neutral-300 px-2 py-1"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="rounded border border-neutral-300 bg-white px-3 py-1 hover:bg-neutral-100"
        >
          Simulate inbound
        </button>
        {simulateFeedback ? (
          <span className="text-neutral-600">{simulateFeedback}</span>
        ) : null}
      </form>
    </div>
  );
}
