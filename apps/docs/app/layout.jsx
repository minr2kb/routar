import { Head } from "nextra/components";
import "./globals.css";
import "nextra-theme-docs/style.css";

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <Head />
      <body>{children}</body>
    </html>
  );
}
