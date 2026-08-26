import { notFound } from "next/navigation";
import * as repo from "@/lib/repo";
import { addPartRequest, addSourcing, setMaintenanceRequestStatus } from "@/lib/actions";
import { BranchBadge, SourceTypeBadge, StatusBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import { BRANCHES, BRANCH_LABELS } from "@/lib/types";

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
  const toggleStatus = setMaintenanceRequestStatus.bind(
    null,
    request.id,
    request.status === "open" ? "closed" : "open",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">طلب صيانة {request.request_number}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {request.customer_name ?? "بدون اسم عميل"} · {request.machine_name ?? "بدون تحديد المكينة"}
          </p>
        </div>
        <form action={toggleStatus}>
          <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {request.status === "open" ? "إغلاق الطلب" : "إعادة فتح الطلب"}
          </button>
        </form>
      </div>

      <form
        action={addPartRequest}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4"
      >
        <input type="hidden" name="maintenance_request_id" value={request.id} />
        <h2 className="font-semibold text-slate-800 sm:col-span-4">إضافة قطعة غيار للطلب</h2>
        <label className="text-sm text-slate-600">
          كود القطعة *
          <input
            name="part_code"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600">
          اسم القطعة
          <input
            name="part_name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600">
          الكمية المطلوبة *
          <input
            type="number"
            min={1}
            name="quantity_needed"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600">
          ملاحظات
          <input
            name="notes"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <div className="sm:col-span-4">
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            إضافة القطعة
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {partRequests.map((partRequest) => {
          const sourcing = repo.listSourcingForPartRequest(partRequest.id);
          const stockHints = repo.findStockForPart(partRequest.part_code);
          const remaining = partRequest.quantity_needed - partRequest.sourced_quantity;

          return (
            <div key={partRequest.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {partRequest.part_code}
                  {partRequest.part_name ? ` – ${partRequest.part_name}` : ""}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  الكمية المطلوبة: {partRequest.quantity_needed} · تم تحديد مصدرها:{" "}
                  {partRequest.sourced_quantity} · تم استلامها: {partRequest.received_quantity}
                  {remaining > 0 && (
                    <span className="mr-2 font-medium text-amber-700">
                      · متبقٍ {remaining} بدون تحديد مصدر
                    </span>
                  )}
                </p>
              </div>

              {stockHints.length > 0 && (
                <p className="mt-2 rounded-md bg-teal-50 px-3 py-2 text-xs text-teal-800">
                  ⚠️ متوفر ستوك لهذه القطعة:{" "}
                  {stockHints
                    .map((stock) => `${BRANCH_LABELS[stock.branch]} (${stock.quantity_available})`)
                    .join("، ")}{" "}
                  — يفضّل السحب من المخزون بدل الطلب لتفادي بيعها بالخطأ.
                </p>
              )}

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-1">الفرع</th>
                      <th className="py-1">الكمية</th>
                      <th className="py-1">النوع</th>
                      <th className="py-1">الحالة</th>
                      <th className="py-1">المستلم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourcing.map((line) => (
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
                      </tr>
                    ))}
                    {sourcing.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-3 text-center text-slate-400">
                          لم يتم تحديد مصدر لهذه القطعة بعد
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
                  الفرع
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
                  الكمية
                  <input
                    type="number"
                    min={1}
                    name="quantity"
                    defaultValue={remaining > 0 ? remaining : 1}
                    className="mt-1 block w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                  />
                </label>
                <label className="text-xs text-slate-600">
                  المصدر
                  <select
                    name="source_type"
                    className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                  >
                    <option value="order">طلب جديد من الفرع</option>
                    <option value="stock_pull">سحب من مخزون الفرع</option>
                  </select>
                </label>
                <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
                  إضافة توزيع
                </button>
              </form>
            </div>
          );
        })}
        {partRequests.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-400">
            لم تتم إضافة أي قطع لهذا الطلب بعد
          </p>
        )}
      </div>
    </div>
  );
}
