import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import { Footer, Layout, Navbar } from "nextra-theme-docs";

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "ko" }];
}

export default async function LangLayout({ children, params }) {
  const { lang } = await params;
  const pageMap = await getPageMap(lang);

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
