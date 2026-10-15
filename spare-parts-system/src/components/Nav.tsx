import Link from "next/link";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/maintenance-requests", label: "Maintenance Requests" },
  { href: "/whatsapp-center", label: "WhatsApp Center" },
  { href: "/receiving", label: "Receiving" },
  { href: "/branch-stock", label: "Branch Stock" },
  { href: "/settings", label: "Settings" },
];

export default function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <span className="text-lg font-bold text-slate-800">📦 Spare Parts – Madinah Branch</span>
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
