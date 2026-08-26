import Link from "next/link";
import * as repo from "@/lib/repo";
import { BranchBadge, SourceTypeBadge, StatusBadge } from "@/components/badges";
import { markReceived, markShipped } from "@/lib/actions";

export default function ReceivingPage() {
  const awaiting = repo.listAwaitingReceipt();
  const awaitingShipment = awaiting.filter((line) => line.status === "message_sent");
  const awaitingConfirmation = awaiting.filter((line) => line.status === "shipped");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">استلام القطع بفرع المدينة</h1>
        <p className="mt-1 text-sm text-slate-500">
          حدّث حالة الشحن، ثم أكّد الاستلام باسم الفني ووقت الاستلام لضمان توثيق كل قطعة أمنيًا.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-800">
          بانتظار الشحن من الفرع ({awaitingShipment.length})
        </h2>
        {awaitingShipment.length === 0 && <p className="text-sm text-slate-400">لا يوجد</p>}
        <div className="space-y-3">
          {awaitingShipment.map((line) => (
            <div
              key={line.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="text-sm">
                <Link
                  href={`/maintenance-requests/${line.maintenance_request_id}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  طلب صيانة {line.request_number}
                </Link>
                <span className="mx-2 text-slate-400">·</span>
                <span className="font-medium text-slate-800">{line.part_code}</span>
                {line.part_name && <span className="text-slate-500"> – {line.part_name}</span>}
                <span className="text-slate-500"> × {line.quantity}</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <BranchBadge branch={line.branch} />
                  <SourceTypeBadge type={line.source_type} />
                  <StatusBadge status={line.status} />
                </div>
              </div>
              <form action={markShipped.bind(null, line.id)} className="flex items-end gap-2">
                <label className="text-xs text-slate-600">
                  رقم تتبع الشحنة (اختياري)
                  <input
                    name="tracking_ref"
                    className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                  />
                </label>
                <button className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700">
                  تم الشحن
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-800">
          تم الشحن — بانتظار تأكيد الاستلام ({awaitingConfirmation.length})
        </h2>
        {awaitingConfirmation.length === 0 && <p className="text-sm text-slate-400">لا يوجد</p>}
        <div className="space-y-3">
          {awaitingConfirmation.map((line) => (
            <div
              key={line.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="text-sm">
                <Link
                  href={`/maintenance-requests/${line.maintenance_request_id}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  طلب صيانة {line.request_number}
                </Link>
                <span className="mx-2 text-slate-400">·</span>
                <span className="font-medium text-slate-800">{line.part_code}</span>
                {line.part_name && <span className="text-slate-500"> – {line.part_name}</span>}
                <span className="text-slate-500"> × {line.quantity}</span>
                {line.tracking_ref && (
                  <span className="text-slate-400"> · تتبع: {line.tracking_ref}</span>
                )}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <BranchBadge branch={line.branch} />
                  <SourceTypeBadge type={line.source_type} />
                  <StatusBadge status={line.status} />
                </div>
              </div>
              <form action={markReceived.bind(null, line.id)} className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-slate-600">
                  اسم الفني المستلم *
                  <input
                    name="received_by"
                    required
                    className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                  />
                </label>
                <label className="text-xs text-slate-600">
                  ملاحظات
                  <input
                    name="notes"
                    className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                  />
                </label>
                <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                  تأكيد الاستلام
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
