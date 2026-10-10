import Link from "next/link";
import * as repo from "@/lib/repo";
import { DESTINATION_BRANCH_LABEL } from "@/lib/types";

// This page reads live counts from SQLite on every request — never
// statically prerender it, or deploys would ship stale build-time numbers.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const stats = repo.dashboardStats();

  const cards = [
    { label: "Open maintenance requests", value: stats.openRequests, href: "/maintenance-requests" },
    { label: "Parts awaiting a WhatsApp message", value: stats.pendingMessages, href: "/whatsapp-center" },
    {
      label: `Parts awaiting receipt at ${DESTINATION_BRANCH_LABEL}`,
      value: stats.awaitingReceipt,
      href: "/receiving",
    },
    { label: "Parts received today", value: stats.receivedToday, href: "/receiving" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="text-3xl font-bold text-slate-900">{card.value}</div>
            <div className="mt-1 text-sm text-slate-500">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 font-semibold text-slate-800">How the workflow works</h2>
        <ol className="list-inside list-decimal space-y-1.5 text-sm text-slate-600">
          <li>
            Create a <b>maintenance request</b> with its number, and add the parts it needs with
            their quantities.
          </li>
          <li>
            Split each part across the branch it actually arrived at (RIYADH / JEDDAH / DABBAB /
            KHOBAR), or pull it from stock already sitting there instead of ordering it again.
          </li>
          <li>
            From the <b>WhatsApp Center</b> page, prepare one combined message per branch listing
            everything it needs, then copy it or send it directly.
          </li>
          <li>
            Once the part arrives at {DESTINATION_BRANCH_LABEL}, log the shipment and then confirm{" "}
            <b>receipt</b> with the technician&apos;s name and time from the Receiving page.
          </li>
        </ol>
      </div>
    </div>
  );
}
