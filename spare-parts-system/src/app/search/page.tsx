import Link from "next/link";
import * as repo from "@/lib/repo";
import type { PartOccurrence } from "@/lib/repo";
import { BranchBadge, SourceTypeBadge, StatusBadge } from "@/components/badges";
import { BRANCH_LABELS } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Grouped {
  part_request_id: number;
  request_number: string;
  maintenance_request_id: number;
  customer_name: string | null;
  request_status: "open" | "closed";
  part_code: string;
  part_name: string | null;
  quantity_needed: number;
  splits: PartOccurrence[];
}

function group(rows: PartOccurrence[]): Grouped[] {
  const map = new Map<number, Grouped>();
  for (const row of rows) {
    let g = map.get(row.part_request_id);
    if (!g) {
      g = {
        part_request_id: row.part_request_id,
        request_number: row.request_number,
        maintenance_request_id: row.maintenance_request_id,
        customer_name: row.customer_name,
        request_status: row.request_status,
        part_code: row.part_code,
        part_name: row.part_name,
        quantity_needed: row.quantity_needed,
        splits: [],
      };
      map.set(row.part_request_id, g);
    }
    if (row.sourcing_id !== null) g.splits.push(row);
  }
  return [...map.values()];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const hasQuery = query.length > 0;

  const occurrences = hasQuery ? repo.searchPartOccurrences(query) : [];
  const stock = hasQuery ? repo.searchStock(query) : [];
  const groups = group(occurrences);

  const totalReceived = occurrences
    .filter((o) => o.sourcing_status === "received")
    .reduce((sum, o) => sum + (o.quantity ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Search Parts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Look up a part code (or name) to see every request it belongs to, which branches it was
          sourced from, and where it currently stands.
        </p>
      </div>

      <form action="/search" method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="Part code or name, e.g. 46-C-07"
          className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
        />
        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
          Search
        </button>
      </form>

      {hasQuery && (
        <p className="text-sm text-slate-600">
          {groups.length === 0 && stock.length === 0 ? (
            <>
              No parts found matching <b>“{query}”</b>.
            </>
          ) : (
            <>
              Found <b>{groups.length}</b> part line{groups.length === 1 ? "" : "s"} across requests,
              with <b>{occurrences.filter((o) => o.sourcing_id !== null).length}</b> branch split
              {occurrences.filter((o) => o.sourcing_id !== null).length === 1 ? "" : "s"}
              {totalReceived > 0 ? (
                <>
                  {" "}
                  · <b>{totalReceived}</b> received
                </>
              ) : null}
              .
            </>
          )}
        </p>
      )}

      {/* Request occurrences */}
      <div className="space-y-4">
        {groups.map((g) => {
          const received = g.splits
            .filter((s) => s.sourcing_status === "received")
            .reduce((sum, s) => sum + (s.quantity ?? 0), 0);
          const sourced = g.splits.reduce((sum, s) => sum + (s.quantity ?? 0), 0);
          return (
            <div key={g.part_request_id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {g.part_code}
                    {g.part_name ? ` – ${g.part_name}` : ""}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    <Link
                      href={`/maintenance-requests/${g.maintenance_request_id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      Request {g.request_number}
                    </Link>
                    {g.customer_name ? ` · ${g.customer_name}` : ""} · Needed {g.quantity_needed} ·
                    Sourced {sourced} · Received {received}
                  </p>
                </div>
                {g.request_status === "open" ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    Open
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Closed
                  </span>
                )}
              </div>

              {g.splits.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-1 font-medium">Branch</th>
                        <th className="py-1 font-medium">Qty</th>
                        <th className="py-1 font-medium">Type</th>
                        <th className="py-1 font-medium">Status</th>
                        <th className="py-1 font-medium">Received by</th>
                        <th className="py-1 font-medium">Tracking</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.splits.map((s) => (
                        <tr key={s.sourcing_id} className="border-t border-slate-100">
                          <td className="py-1.5">{s.branch && <BranchBadge branch={s.branch} />}</td>
                          <td className="py-1.5">{s.quantity}</td>
                          <td className="py-1.5">
                            {s.source_type && <SourceTypeBadge type={s.source_type} />}
                          </td>
                          <td className="py-1.5">
                            {s.sourcing_status && <StatusBadge status={s.sourcing_status} />}
                          </td>
                          <td className="py-1.5 text-slate-600">
                            {s.received_by
                              ? `${s.received_by} · ${formatDateTime(s.received_at!)}`
                              : "—"}
                          </td>
                          <td className="py-1.5 text-slate-500">{s.tracking_ref ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Requested but not sourced to any branch yet.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Branch stock matches */}
      {stock.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">In branch stock</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1 font-medium">Branch</th>
                  <th className="py-1 font-medium">Part code</th>
                  <th className="py-1 font-medium">Part name</th>
                  <th className="py-1 font-medium">Available</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="py-1.5">
                      <BranchBadge branch={s.branch} />
                    </td>
                    <td className="py-1.5 font-medium">{s.part_code}</td>
                    <td className="py-1.5">{s.part_name ?? "—"}</td>
                    <td className="py-1.5">{s.quantity_available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
