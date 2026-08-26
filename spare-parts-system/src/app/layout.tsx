import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "نظام طلبات قطع الغيار - فرع المدينة",
  description: "ربط طلبات قطع الغيار بطلبات الصيانة والفروع، وتجهيز رسائل واتساب، وتوثيق الاستلام",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
