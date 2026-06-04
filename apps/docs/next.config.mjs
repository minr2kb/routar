import nextra from "nextra";

const withNextra = nextra({});

export default withNextra({
  i18n: {
    locales: ["en", "ko"],
    defaultLocale: "en",
  },
  // The Plugins reference page moved from `/api-reference/middleware` to
  // `/api-reference/plugins`. Keep old links (npm readme, llms.txt, bookmarks) working.
  redirects: async () => [
    {
      source: "/:lang(en|ko)/api-reference/middleware",
      destination: "/:lang/api-reference/plugins",
      permanent: true,
    },
  ],
});
