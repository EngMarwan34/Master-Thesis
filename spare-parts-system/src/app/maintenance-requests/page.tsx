import Link from "next/link";
import * as repo from "@/lib/repo";
import { createMaintenanceRequest } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function MaintenanceRequestsPage() {
  const requests = repo.listMaintenanceRequests();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">طلبات الصيانة</h1>

      <form
        action={createMaintenanceRequest}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
      >
        <h2 className="font-semibold text-slate-800 sm:col-span-2">طلب صيانة جديد</h2>
        <label className="text-sm text-slate-600">
          رقم طلب الصيانة *
          <input
            name="request_number"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600">
          اسم العميل
          <input
            name="customer_name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600">
          المكينة / الجهاز
          <input
            name="machine_name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600 sm:col-span-2">
          ملاحظات
          <textarea
            name="notes"
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <div className="sm:col-span-2">
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            إضافة الطلب
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">رقم الطلب</th>
              <th className="px-4 py-2">العميل</th>
              <th className="px-4 py-2">المكينة</th>
              <th className="px-4 py-2">الحالة</th>
              <th className="px-4 py-2">تاريخ الإنشاء</th>
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
                <td className="px-4 py-2">{request.status === "open" ? "مفتوح" : "مغلق"}</td>
                <td className="px-4 py-2 text-slate-500">{formatDateTime(request.created_at)}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  لا توجد طلبات صيانة بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
