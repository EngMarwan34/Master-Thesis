"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/maintenance-requests", label: "Maintenance Requests" },
  { href: "/search", label: "Search" },
  { href: "/whatsapp-center", label: "WhatsApp Center" },
  { href: "/receiving", label: "Receiving" },
  { href: "/branch-stock", label: "Branch Stock" },
  { href: "/settings", label: "Settings" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <nav className="flex flex-wrap gap-1 sm:ml-auto">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700"
                    : "rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <form action="/search" method="get" className="relative sm:w-52">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            name="q"
            placeholder="Search a part…"
            aria-label="Search parts"
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pr-3 pl-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </form>
      </div>
    </header>
  );
}
