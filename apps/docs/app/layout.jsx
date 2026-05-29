import "./globals.css";
import "nextra-theme-docs/style.css";

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
