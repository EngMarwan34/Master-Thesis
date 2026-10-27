import Link from "next/link";
import * as repo from "@/lib/repo";
import {
  createMaintenanceRequest,
  deleteMaintenanceRequest,
  setMaintenanceRequestStatus,
} from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function MaintenanceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ closed?: string }>;
}) {
  const { closed } = await searchParams;
  const includeClosed = closed === "1";
  const requests = repo.listMaintenanceRequests(includeClosed);
  const closedCount = repo.countClosedMaintenanceRequests();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Maintenance Requests</h1>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          <Link
            href="/maintenance-requests"
            className={
              !includeClosed
                ? "rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white"
                : "rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50"
            }
          >
            Active
          </Link>
          <Link
            href="/maintenance-requests?closed=1"
            className={
              includeClosed
                ? "rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white"
                : "rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50"
            }
          >
            All{closedCount > 0 ? ` · ${closedCount} closed` : ""}
          </Link>
        </div>
      </div>

      <form
        action={createMaintenanceRequest}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"
      >
        <h2 className="font-semibold text-slate-800 sm:col-span-2">New Maintenance Request</h2>
        <label className="text-sm text-slate-600">
          Maintenance request number *
          <input
            name="request_number"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </label>
        <label className="text-sm text-slate-600">
          Customer name
          <input
            name="customer_name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </label>
        <label className="text-sm text-slate-600">
          Machine / equipment
          <input
            name="machine_name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </label>
        <label className="text-sm text-slate-600 sm:col-span-2">
          Notes
          <textarea
            name="notes"
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </label>
        <div className="sm:col-span-2">
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
            Add Request
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2.5 font-medium">Request #</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Machine</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => {
              const isOpen = request.status === "open";
              const toggle = setMaintenanceRequestStatus.bind(
                null,
                request.id,
                isOpen ? "closed" : "open",
              );
              const remove = deleteMaintenanceRequest.bind(null, request.id);
              return (
                <tr
                  key={request.id}
                  className={`border-t border-slate-100 hover:bg-slate-50 ${
                    isOpen ? "" : "bg-slate-50/60 text-slate-400"
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/maintenance-requests/${request.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {request.request_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{request.customer_name ?? "—"}</td>
                  <td className="px-4 py-2.5">{request.machine_name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {isOpen ? (
                      <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        Open
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        Closed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDateTime(request.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <form action={toggle}>
                        <button className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          {isOpen ? "Close" : "Reopen"}
                        </button>
                      </form>
                      <DeleteButton
                        action={remove}
                        confirmMessage={`Delete request ${request.request_number} and all its parts? This cannot be undone.`}
                        title="Delete request"
                        className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </DeleteButton>
                    </div>
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {includeClosed
                    ? "No maintenance requests yet"
                    : "No active requests — switch to “All” to see closed ones"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
