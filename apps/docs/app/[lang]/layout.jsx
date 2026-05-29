import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import { Footer, Layout, Navbar } from "nextra-theme-docs";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://routar.dev";

const ogLocales = { en: "en_US", ko: "ko_KR" };

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    metadataBase: new URL(BASE_URL),
    title: {
      absolute: "routar",
      template: "%s – routar",
    },
    description:
      "Schema-first HTTP API client with end-to-end type safety and runtime validation. Define once, validate everywhere.",
    openGraph: {
      type: "website",
      locale: ogLocales[lang] ?? "en_US",
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
}

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "ko" }];
}

export default async function LangLayout({ children, params }) {
  const { lang } = await params;
  const pageMap = await getPageMap(`/${lang}`);

  return (
    <>
      <Head />
      <Layout
        pageMap={pageMap}
        i18n={[
          { locale: "en", name: "English" },
          { locale: "ko", name: "한국어" },
        ]}
        navbar={
          <Navbar
            logo={<b>routar</b>}
            projectLink="https://github.com/minr2kb/routar"
          />
        }
        docsRepositoryBase="https://github.com/minr2kb/routar/tree/main/apps/docs"
        footer={<Footer>MIT {new Date().getFullYear()} © routar</Footer>}
        sidebar={{ defaultMenuCollapseLevel: 1 }}
      >
        {children}
      </Layout>
    </>
  );
}
