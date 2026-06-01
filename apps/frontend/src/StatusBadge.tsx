import type { MessageStatus } from "@sms/shared";

const statusClass: Record<MessageStatus, string> = {
  received: "border-neutral-300 bg-neutral-50 text-neutral-700",
  processing: "border-amber-300 bg-amber-50 text-amber-800",
  sent: "border-emerald-300 bg-emerald-50 text-emerald-800",
  failed: "border-red-300 bg-red-50 text-red-700",
};

export function StatusBadge({ status }: { status: MessageStatus }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-xs ${statusClass[status]}`}
    >
      {status}
    </span>
  );
}
