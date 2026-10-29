import { notFound } from "next/navigation";
import * as repo from "@/lib/repo";
import {
  addPartRequest,
  addSourcing,
  deleteMaintenanceRequest,
  deletePartRequest,
  deleteSourcing,
  setMaintenanceRequestStatus,
  updateMaintenanceRequest,
  updatePartRequest,
} from "@/lib/actions";
import { BranchBadge, SourceTypeBadge, StatusBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import { BRANCHES, BRANCH_LABELS } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";
import EditRequestForm from "@/components/EditRequestForm";
import EditPartForm from "@/components/EditPartForm";

export const dynamic = "force-dynamic";

export default async function MaintenanceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const requestId = Number(id);
  const request = repo.getMaintenanceRequest(requestId);
  if (!request) notFound();

  const partRequests = repo.listPartRequestsWithSummary(requestId);
  const isOpen = request.status === "open";
  const toggleStatus = setMaintenanceRequestStatus.bind(
    null,
    request.id,
    isOpen ? "closed" : "open",
  );
  const editRequest = updateMaintenanceRequest.bind(null, request.id);
  const removeRequest = deleteMaintenanceRequest.bind(null, request.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EditRequestForm request={request} action={editRequest} />
        <div className="flex items-center gap-2">
          <form action={toggleStatus}>
            <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {isOpen ? "Close Request" : "Reopen Request"}
            </button>
          </form>
          <DeleteButton
            action={removeRequest}
            confirmMessage={`Delete request ${request.request_number} and all its parts? This cannot be undone.`}
            className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </DeleteButton>
        </div>
      </div>

      {!isOpen && (
        <div className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-600">
          This request is closed. Reopen it to make further changes.
        </div>
      )}

      <form
        action={addPartRequest}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-4"
      >
        <input type="hidden" name="maintenance_request_id" value={request.id} />
        <h2 className="font-semibold text-slate-800 sm:col-span-4">Add a Spare Part to This Request</h2>
        <label className="text-sm text-slate-600">
          Part code *
          <input
            name="part_code"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </label>
        <label className="text-sm text-slate-600">
          Part name
          <input
            name="part_name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </label>
        <label className="text-sm text-slate-600">
          Quantity needed *
          <input
            type="number"
            min={1}
            name="quantity_needed"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </label>
        <label className="text-sm text-slate-600">
          Notes
          <input
            name="notes"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </label>
        <div className="sm:col-span-4">
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
            Add Part
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {partRequests.map((partRequest) => {
          const sourcing = repo.listSourcingForPartRequest(partRequest.id);
          const stockHints = repo.findStockForPart(partRequest.part_code);
          const remaining = partRequest.quantity_needed - partRequest.sourced_quantity;
          const editPart = updatePartRequest.bind(null, partRequest.id, request.id);
          const removePart = deletePartRequest.bind(null, partRequest.id, request.id);

          return (
            <div key={partRequest.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <EditPartForm
                part={partRequest}
                action={editPart}
                actions={
                  <DeleteButton
                    action={removePart}
                    confirmMessage={`Delete part ${partRequest.part_code} and its branch splits?`}
                    className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </DeleteButton>
                }
              >
                <h3 className="font-semibold text-slate-900">
                  {partRequest.part_code}
                  {partRequest.part_name ? ` – ${partRequest.part_name}` : ""}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Needed: {partRequest.quantity_needed} · Sourced: {partRequest.sourced_quantity} ·
                  Received: {partRequest.received_quantity}
                  {remaining > 0 && (
                    <span className="ml-2 font-medium text-amber-700">· {remaining} still unsourced</span>
                  )}
                </p>
              </EditPartForm>

              {stockHints.length > 0 && (
                <p className="mt-2 rounded-md bg-teal-50 px-3 py-2 text-xs text-teal-800">
                  ⚠️ Stock already available for this part:{" "}
                  {stockHints
                    .map((stock) => `${BRANCH_LABELS[stock.branch]} (${stock.quantity_available})`)
                    .join(", ")}{" "}
                  — pull from stock instead of ordering to avoid it being sold by mistake.
                </p>
              )}

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-1 font-medium">Branch</th>
                      <th className="py-1 font-medium">Qty</th>
                      <th className="py-1 font-medium">Type</th>
                      <th className="py-1 font-medium">Status</th>
                      <th className="py-1 font-medium">Received by</th>
                      <th className="py-1 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourcing.map((line) => {
                      const removeLine = deleteSourcing.bind(null, line.id, request.id);
                      return (
                        <tr key={line.id} className="border-t border-slate-100">
                          <td className="py-1.5">
                            <BranchBadge branch={line.branch} />
                          </td>
                          <td className="py-1.5">{line.quantity}</td>
                          <td className="py-1.5">
                            <SourceTypeBadge type={line.source_type} />
                          </td>
                          <td className="py-1.5">
                            <StatusBadge status={line.status} />
                          </td>
                          <td className="py-1.5 text-slate-600">
                            {line.received_by
                              ? `${line.received_by} · ${formatDateTime(line.received_at!)}`
                              : "—"}
                          </td>
                          <td className="py-1.5 text-right">
                            <DeleteButton
                              action={removeLine}
                              confirmMessage={`Remove the ${BRANCH_LABELS[line.branch]} split (${line.quantity} pcs)?${
                                line.source_type === "stock_pull"
                                  ? " The pulled quantity will be returned to stock."
                                  : ""
                              }`}
                              title="Remove split"
                              className="rounded-md border border-red-200 bg-white px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </DeleteButton>
                          </td>
                        </tr>
                      );
                    })}
                    {sourcing.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-3 text-center text-slate-400">
                          No source assigned to this part yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form
                action={addSourcing}
                className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3"
              >
                <input type="hidden" name="part_request_id" value={partRequest.id} />
                <input type="hidden" name="maintenance_request_id" value={request.id} />
                <label className="text-xs text-slate-600">
                  Branch
                  <select
                    name="branch"
                    className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                  >
                    {BRANCHES.map((branch) => (
                      <option key={branch} value={branch}>
                        {BRANCH_LABELS[branch]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-600">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    name="quantity"
                    defaultValue={remaining > 0 ? remaining : 1}
                    className="mt-1 block w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                  />
                </label>
                <label className="text-xs text-slate-600">
                  Source
                  <select
                    name="source_type"
                    className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                  >
                    <option value="order">New order from branch</option>
                    <option value="stock_pull">Pull from branch stock</option>
                  </select>
                </label>
                <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
                  Add Split
                </button>
              </form>
            </div>
          );
        })}
        {partRequests.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-400">
            No parts added to this request yet
          </p>
        )}
      </div>
    </div>
  );
}
