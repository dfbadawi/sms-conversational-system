import type { ConversationSummary } from "@sms/shared";
import { StatusBadge } from "./StatusBadge";
import { formatDateTime } from "./utils/dates";

type Props = {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: Props) {
  return (
    <section className="rounded border border-neutral-200 bg-white p-3">
      <h2 className="mb-2 font-medium">Conversations</h2>

      {conversations.length === 0 ? (
        <p className="text-neutral-500">
          No conversations yet. Simulate an inbound SMS below.
        </p>
      ) : (
        <ul className="space-y-1">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={`w-full rounded border px-2 py-2 text-left ${
                  selectedId === c.id
                    ? "border-blue-400 bg-blue-50"
                    : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="font-medium">{c.phoneFrom}</div>
                <div className="text-xs text-neutral-500">to {c.phoneTo}</div>
                <div className="truncate text-neutral-500">
                  {c.lastMessageBody ?? "—"}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-neutral-500">
                  {c.lastMessageStatus ? (
                    <StatusBadge status={c.lastMessageStatus} />
                  ) : (
                    <span />
                  )}
                  <time dateTime={c.updatedAt}>{formatDateTime(c.updatedAt)}</time>
                </div>
                <p className="mt-1 text-xs text-neutral-400">id: {c.id}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
