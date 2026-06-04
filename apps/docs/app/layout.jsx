import { Head } from "nextra/components";
import "./globals.css";
import "nextra-theme-docs/style.css";

export default function RootLayout({ children }) {
  return (
    // biome-ignore lint/a11y/useHtmlLang: ignore
    <html suppressHydrationWarning>
      <Head />
      <body>{children}</body>
    </html>
  );
}
