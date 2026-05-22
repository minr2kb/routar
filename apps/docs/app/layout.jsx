import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import { Footer, Layout, Navbar } from "nextra-theme-docs";
import "nextra-theme-docs/style.css";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://routar.dev";

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    absolute: "routar",
    template: "%s – routar",
  },
  description:
    "Schema-first HTTP API client with end-to-end type safety and runtime validation. Define once, validate everywhere.",
  keywords: [
    "routar",
    "HTTP client",
    "TypeScript",
    "schema validation",
    "Zod",
    "type safety",
    "API client",
    "fetch",
    "axios",
  ],
  authors: [{ name: "Kyungbae Min", url: "https://github.com/minr2kb" }],
  creator: "Kyungbae Min",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "routar",
    title: "routar – Schema-first HTTP API client",
    description:
      "Schema-first HTTP API client with end-to-end type safety and runtime validation.",
    images: [
      { url: "/opengraph-image", width: 1200, height: 630, alt: "routar" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "routar – Schema-first HTTP API client",
    description:
      "Schema-first HTTP API client with end-to-end type safety and runtime validation.",
    images: ["/opengraph-image"],
  },
};

export default async function RootLayout({ children }) {
  const pageMap = await getPageMap();
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={
            <Navbar
              logo={<b>routar</b>}
              projectLink="https://github.com/minr2kb/routar"
            />
          }
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/minr2kb/routar/tree/main/apps/docs"
          footer={<Footer>MIT {new Date().getFullYear()} © routar</Footer>}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
