import Link from "next/link";
import * as repo from "@/lib/repo";
import { DESTINATION_BRANCH_LABEL } from "@/lib/types";

// This page reads live counts from SQLite on every request — never
// statically prerender it, or deploys would ship stale build-time numbers.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const stats = repo.dashboardStats();

  const cards = [
    {
      label: "Open maintenance requests",
      value: stats.openRequests,
      href: "/maintenance-requests",
      accent: "text-blue-600",
      ring: "bg-blue-50",
    },
    {
      label: "Parts awaiting a WhatsApp message",
      value: stats.pendingMessages,
      href: "/whatsapp-center",
      accent: "text-amber-600",
      ring: "bg-amber-50",
    },
    {
      label: `Parts awaiting receipt at ${DESTINATION_BRANCH_LABEL}`,
      value: stats.awaitingReceipt,
      href: "/receiving",
      accent: "text-purple-600",
      ring: "bg-purple-50",
    },
    {
      label: "Parts received today",
      value: stats.receivedToday,
      href: "/receiving",
      accent: "text-emerald-600",
      ring: "bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className={`text-4xl font-bold ${card.accent}`}>{card.value}</div>
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.ring} ${card.accent}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m7.5 4.27 9 5.15" />
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="M3.3 7 12 12l8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </span>
            </div>
            <div className="mt-2 text-sm text-slate-500">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
