import type { ConversationDetail, MessageDto } from "@sms/shared";
import { StatusBadge } from "./StatusBadge";
import { formatDateTime } from "./utils/dates";

type Props = {
  conversation: ConversationDetail | null;
};

function MessageBubble({ message }: { message: MessageDto }) {
  const inbound = message.direction === "inbound";

  return (
    <div
      className={`max-w-[85%] rounded border border-neutral-200 px-3 py-2 ${
        inbound
          ? "self-start bg-slate-100"
          : "self-end bg-emerald-50"
      }`}
    >
      <div className="mb-1 flex justify-between gap-2 text-xs text-neutral-500">
        <span>{inbound ? "Inbound" : "Outbound"}</span>
        <time dateTime={message.occurredAt}>
          {formatDateTime(message.occurredAt)}
        </time>
      </div>
      <p className="whitespace-pre-wrap">{message.body}</p>
      <div className="mt-1">
        <StatusBadge status={message.status} />
      </div>
      <p className="mt-1 text-xs text-neutral-400">id: {message.id}</p>
      {message.lastError ? (
        <p className="mt-1 text-xs text-red-600">{message.lastError}</p>
      ) : null}
    </div>
  );
}

export function ConversationDetailPanel({ conversation }: Props) {
  return (
    <section className="min-h-64 rounded border border-neutral-200 bg-white p-3">
      <h2 className="mb-2 font-medium">Messages</h2>

      {!conversation ? (
        <p className="text-neutral-500">
          Select a conversation to view messages.
        </p>
      ) : (
        <>
          <p className="mb-3 border-b border-neutral-100 pb-2 text-neutral-600">
            {conversation.phoneFrom} → {conversation.phoneTo}
            <span className="ml-2 text-xs">
              · {formatDateTime(conversation.updatedAt)}
            </span>
          </p>
          <div className="flex flex-col gap-2">
            {conversation.messages.length === 0 ? (
              <p className="text-neutral-500">
                No messages in this conversation.
              </p>
            ) : (
              conversation.messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
