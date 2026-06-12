import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = { title: "routar dev" };

const NAV = [
  { href: "/", label: "Home" },
  { href: "/todos", label: "Todos" },
  { href: "/posts", label: "Posts" },
  { href: "/users", label: "Users" },
  { href: "/catalog", label: "Catalog" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-ink">
        <Providers>
          <nav className="sticky top-0 z-10 flex items-center gap-6 border-b border-line bg-white/80 px-6 py-3 backdrop-blur">
            <span className="font-bold tracking-tight text-brand-fg">routar</span>
            <div className="flex gap-5 text-sm text-muted">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="no-underline transition-colors hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
          <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
