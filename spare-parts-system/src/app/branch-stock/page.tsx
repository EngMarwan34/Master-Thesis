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
        <h1 className="text-2xl font-bold text-slate-900">Branch Stock</h1>
        <p className="mt-1 text-sm text-slate-500">
          Log parts already sitting in stock at the RIYADH, JEDDAH, DABBAB, and KHOBAR branches so
          they can be pulled instead of reordered — and to avoid one being sold to another
          customer by mistake.
        </p>
      </div>

      <form
        action={upsertBranchStock}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-5"
      >
        <h2 className="font-semibold text-slate-800 sm:col-span-5">Add / Update Stock</h2>
        <label className="text-sm text-slate-600">
          Branch
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
          Part code *
          <input
            name="part_code"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600">
          Part name
          <input
            name="part_name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="text-sm text-slate-600">
          Quantity available
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
            Save
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">Branch</th>
              <th className="px-4 py-2">Part Code</th>
              <th className="px-4 py-2">Part Name</th>
              <th className="px-4 py-2">Qty Available</th>
              <th className="px-4 py-2">Last Updated</th>
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
                    <button className="text-xs text-red-600 hover:underline">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {stock.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No stock recorded yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
