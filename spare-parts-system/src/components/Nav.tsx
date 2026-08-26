import Link from "next/link";

const LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/maintenance-requests", label: "طلبات الصيانة" },
  { href: "/whatsapp-center", label: "مركز رسائل واتساب" },
  { href: "/receiving", label: "استلام القطع" },
  { href: "/branch-stock", label: "مخزون الفروع" },
  { href: "/settings", label: "الإعدادات" },
];

export default function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <span className="text-lg font-bold text-slate-800">📦 قطع الغيار – فرع المدينة</span>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
