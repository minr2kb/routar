import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata = {
  title: {
    absolute: 'routar',
    template: '%s – routar',
  },
  description: 'Schema-first HTTP API client with end-to-end type safety and runtime validation.',
}

export default async function RootLayout({ children }) {
  const pageMap = await getPageMap()
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={<Navbar logo={<b>routar</b>} projectLink="https://github.com/kbmin1129/routar" />}
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/kbmin1129/routar/tree/main/apps/docs"
          footer={<Footer>MIT {new Date().getFullYear()} © routar</Footer>}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
