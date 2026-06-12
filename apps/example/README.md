# @routar/example

A small but realistic Next.js 15 (App Router) app that shows how to structure a
project with `@routar/*`. The point isn't a feature gallery — it's the file
layout you'd actually use.

## Folder layout

```
remote/                     ← the data layer (copy this shape into your app)
  lib/
    constants.ts            base URLs
    plugins.ts              custom ExecutorPlugin (correlation header + HttpError mapping)
    executors/
      api.ts                external API — axios on client, fetch on server (dispatchExecutor)
      local.ts              local Next route handlers — fetch, baseURL factory
      ky.ts                 ky transport, with the plugin attached
  services/
    todo.ts                 one file per domain: router + schemas + createApi + createQueries + types
    post.ts
    user.ts
    catalog.ts
app/
  <domain>/page.tsx         server components: prefetch → HydrationBoundary → <Suspense>
  api/                      local Next route handlers (the backend for todo + catalog)
components/
  <Domain>*.tsx             client components: useSuspenseQuery / useMutation
utils/
  get-query-client.ts       isServer-aware QueryClient (routarMutationCache wired)
```

**The rule:** everything about a domain's API lives in its one
`remote/services/<domain>.ts`. Pages and components import the typed client and
the `createQueries` helpers from there — they never re-declare routes, keys, or
fetch logic.

## Where each routar feature lives

| Feature | Where |
|---|---|
| Endpoint + router declaration, `createApi`, `createQueries` | every `services/*.ts` |
| `adapter` (transform validated response) | `user.ts` (flatten nested fields) |
| Standard Schema validator (ArkType) | `user.ts` |
| `validate: 'warn'` + `onValidationError` (drift observation) | `user.ts` |
| `flatten` + dynamic `defaults` + `invalidates` | `todo.ts` |
| Infinite pagination contract | `post.ts` |
| Nested routers | `catalog.ts` (products + categories) |
| Separated request buckets (`pathParams` / `body`) | `catalog.ts` |
| POST-as-query (`queryEndpoints`) | `catalog.ts` (`search`) |
| Per-call options (`timeout`, `headers`) | `components/CatalogClient.tsx` (create) |
| Pluggable transport (fetch / axios / ky) + custom plugin | `lib/executors/*`, `lib/plugins.ts` |

## Run

```bash
bun run --filter '@routar/example' dev
```

> Standalone, isolated feature demos (the old "recipes" playground) are parked in
> `docs/_workspace/example-playground/` and will move into the docs site.
