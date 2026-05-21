import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://routar.dev'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    ['', 1.0],
    ['/getting-started', 0.9],
    ['/why', 0.8],
    ['/api-reference', 0.9],
    ['/api-reference/endpoint', 0.8],
    ['/api-reference/define-router', 0.8],
    ['/api-reference/create-api', 0.8],
    ['/api-reference/create-executor', 0.8],
    ['/api-reference/middleware', 0.8],
    ['/executors', 0.8],
    ['/executors/fetch', 0.7],
    ['/executors/axios', 0.7],
    ['/guides/ssr-csr', 0.7],
    ['/guides/custom-executor', 0.7],
    ['/guides/error-handling', 0.7],
  ] as const

  return routes.map(([route, priority]) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority,
  }))
}
