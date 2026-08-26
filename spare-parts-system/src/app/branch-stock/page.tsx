import * as repo from "@/lib/repo";
import { BRANCHES, BRANCH_LABELS } from "@/lib/types";
import { deleteBranchStock, upsertBranchStock } from "@/lib/actions";
import { BranchBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function BranchStockPage() {
  const stock = repo.listBranchStock();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">مخزون الفروع</h1>
        <p className="mt-1 text-sm text-slate-500">
          سجّل القطع المتوفرة مسبقًا في فروع جدة والرياض والخبر حتى يتم سحبها بدل طلبها من المورد،
          وتفاديًا لبيعها بالخطأ لعميل آخر.
        </p>
      </div>

      <form
        action={upsertBranchStock}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-5"
      >
        <h2 className="font-semibold text-slate-800 sm:col-span-5">إضافة / تحديث رصيد</h2>
        <label className="text-sm text-slate-600">
          الفرع
          <select
            name="branch"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          >
            {BRANCHES.map((branch) => (
              <option key={branch} value={branch}>
                {BRANCH_LABELS[branch]}
              </option>
            ))}
          </select>
        </label>
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
          الكمية المتوفرة
          <input
            type="number"
            min={0}
            name="quantity_available"
            defaultValue={0}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <div className="flex items-end">
          <button className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            حفظ
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">الفرع</th>
              <th className="px-4 py-2">كود القطعة</th>
              <th className="px-4 py-2">اسم القطعة</th>
              <th className="px-4 py-2">الكمية المتوفرة</th>
              <th className="px-4 py-2">آخر تحديث</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {stock.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <BranchBadge branch={item.branch} />
                </td>
                <td className="px-4 py-2 font-medium">{item.part_code}</td>
                <td className="px-4 py-2">{item.part_name ?? "—"}</td>
                <td className="px-4 py-2">{item.quantity_available}</td>
                <td className="px-4 py-2 text-slate-500">{formatDateTime(item.updated_at)}</td>
                <td className="px-4 py-2">
                  <form action={deleteBranchStock.bind(null, item.id)}>
                    <button className="text-xs text-red-600 hover:underline">حذف</button>
                  </form>
                </td>
              </tr>
            ))}
            {stock.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  لا يوجد سجل مخزون بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
