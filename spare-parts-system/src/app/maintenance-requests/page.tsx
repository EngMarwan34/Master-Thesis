import Link from "next/link";
import * as repo from "@/lib/repo";
import { createMaintenanceRequest } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function MaintenanceRequestsPage() {
  const requests = repo.listMaintenanceRequests();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Maintenance Requests</h1>

      <form
        action={createMaintenanceRequest}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
      >
        <h2 className="font-semibold text-slate-800 sm:col-span-2">New Maintenance Request</h2>
        <label className="text-sm text-slate-600">
          Maintenance request number *
          <input
            name="request_number"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600">
          Customer name
          <input
            name="customer_name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600">
          Machine / equipment
          <input
            name="machine_name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600 sm:col-span-2">
          Notes
          <textarea
            name="notes"
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <div className="sm:col-span-2">
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Add Request
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">Request #</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Machine</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/maintenance-requests/${request.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {request.request_number}
                  </Link>
                </td>
                <td className="px-4 py-2">{request.customer_name ?? "—"}</td>
                <td className="px-4 py-2">{request.machine_name ?? "—"}</td>
                <td className="px-4 py-2">{request.status === "open" ? "Open" : "Closed"}</td>
                <td className="px-4 py-2 text-slate-500">{formatDateTime(request.created_at)}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No maintenance requests yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
