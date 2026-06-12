import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = { title: "routar dev" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <nav
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid #eee",
              display: "flex",
              gap: 24,
            }}
          >
            <a href="/">Home</a>
            <a href="/todos">Todos</a>
            <a href="/posts">Posts</a>
            <a href="/users">Users</a>
            <a href="/catalog">Catalog</a>
          </nav>
          <main style={{ padding: "24px" }}>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
