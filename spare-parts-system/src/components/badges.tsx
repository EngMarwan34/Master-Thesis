import { BRANCH_LABELS, type Branch, type SourceType, type SourcingStatus } from "@/lib/types";

const STATUS_STYLES: Record<SourcingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  message_sent: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  received: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABELS: Record<SourcingStatus, string> = {
  pending: "Awaiting message",
  message_sent: "Sent via WhatsApp",
  shipped: "Shipped",
  received: "Received",
};

export function StatusBadge({ status }: { status: SourcingStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function BranchBadge({ branch }: { branch: Branch }) {
  return (
    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      {BRANCH_LABELS[branch]}
    </span>
  );
}

export function SourceTypeBadge({ type }: { type: SourceType }) {
  if (type === "stock_pull") {
    return (
      <span className="inline-block rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800">
        Stock pull
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      New order
    </span>
  );
}
