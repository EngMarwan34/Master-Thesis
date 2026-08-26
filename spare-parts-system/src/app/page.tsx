import Link from "next/link";
import * as repo from "@/lib/repo";

export default function DashboardPage() {
  const stats = repo.dashboardStats();

  const cards = [
    { label: "طلبات صيانة مفتوحة", value: stats.openRequests, href: "/maintenance-requests" },
    { label: "قطع بانتظار تجهيز رسالة واتساب", value: stats.pendingMessages, href: "/whatsapp-center" },
    { label: "قطع بانتظار الاستلام بفرع المدينة", value: stats.awaitingReceipt, href: "/receiving" },
    { label: "قطع تم استلامها اليوم", value: stats.receivedToday, href: "/receiving" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">نظرة عامة</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="text-3xl font-bold text-slate-900">{card.value}</div>
            <div className="mt-1 text-sm text-slate-500">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 font-semibold text-slate-800">كيف تسير العملية؟</h2>
        <ol className="list-inside list-decimal space-y-1.5 text-sm text-slate-600">
          <li>
            أنشئ <b>طلب صيانة</b> برقمه، وأضف له القطع المطلوبة وكمياتها.
          </li>
          <li>
            وزّع كل قطعة على الفرع الذي وصلت إليه (جدة / الرياض / الخبر)، أو اسحبها من مخزون
            متوفر لديهم مسبقًا بدل طلبها من جديد.
          </li>
          <li>
            من صفحة <b>مركز رسائل واتساب</b> جهّز رسالة موحدة لكل فرع تجمع كل قطعها المطلوبة،
            وانسخها أو أرسلها مباشرة.
          </li>
          <li>
            عند وصول القطعة لفرع المدينة، وثّق الشحن ثم أكّد <b>الاستلام</b> باسم الفني ووقت
            الاستلام من صفحة استلام القطع.
          </li>
        </ol>
      </div>
    </div>
  );
}
