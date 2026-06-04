export { middleware } from "nextra/locales";

export const config = {
  // Only run the locale middleware on page routes. Exclude framework internals,
  // metadata routes (sitemap.xml, robots.txt, opengraph-image), and ANY request
  // for a file with an extension (llms.txt, llms-full.txt, context7.json, images,
  // fonts, …) — otherwise i18n would redirect e.g. /llms.txt → /en/llms.txt and
  // break the public asset.
  matcher: [
    "/((?!api/|_next/static|_next/image|_pagefind|manifest|opengraph-image|.*\\..*).*)",
  ],
};
