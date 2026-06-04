import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://routar.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    ["", 1.0],
    ["/why", 0.8],
    ["/getting-started", 0.9],
    ["/api-reference", 0.9],
    ["/api-reference/endpoint", 0.8],
    ["/api-reference/define-router", 0.8],
    ["/api-reference/create-api", 0.8],
    ["/api-reference/create-executor", 0.8],
    ["/api-reference/dispatch-executor", 0.8],
    ["/api-reference/plugins", 0.8],
    ["/api-reference/api-types", 0.8],
    ["/api-reference/create-queries", 0.8],
    ["/executors", 0.8],
    ["/executors/fetch", 0.7],
    ["/executors/axios", 0.7],
    ["/executors/ky", 0.7],
    ["/guides", 0.7],
    ["/guides/ssr-csr", 0.7],
    ["/guides/react-query", 0.7],
    ["/guides/custom-executor", 0.7],
    ["/guides/error-handling", 0.7],
    ["/guides/mocking", 0.7],
    ["/ai-integration", 0.7],
  ] as const;

  return routes.map(([route, priority]) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority,
  }));
}
