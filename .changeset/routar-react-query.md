---
"@routar/react-query": minor
"@routar/core": minor
---

Add `@routar/react-query`: derive TanStack Query `queryOptions`/`mutationOptions` factories from a routar API client via `createQueries(api)`, with declarative invalidation through `routarMutationCache`. The router is not re-passed — `createApi` now stamps it on the client's non-enumerable `$router` property, and `createQueries` recovers it.

`@routar/core` changes (all backward-compatible): `endpoint()` preserves the literal `method` type; `createApi` returns `ApiClientWithRouter` (the client carries its source router on `$router`, excluded from `ApiTypes`); both `ApiClient` and `ApiClientWithRouter` types are exported.

Additional `@routar/react-query` features: `createQueries(api, { defaults })` accepts per-endpoint default options (merged before per-call options, top-level endpoints only); in development, a one-time `console.warn` is emitted when `invalidates` is declared on a mutation but no `routarMutationCache` is wired into the `QueryClient`; calling `getList()` and `getList({})` produce identical query keys (empty-param normalization).

Every GET query accessor now has an `.infinite(params?, override?)` member that returns a native TanStack `infiniteQueryOptions` object. The pagination contract (`initialPageParam`, `getNextPageParam`, and the routar-specific `pageParam` builder) is declared once in `createQueries({ infinite: { <endpoint>: { ... } } })` — call sites then only pass base params. The `pageParam` builder maps the page param to a partial request (deep-merged into base params, replaces `queryFn`). A partial override can be passed as the second arg (call wins). If no config exists and no full contract is supplied, a runtime error is thrown. Key shape: `[...root, endpointName, "infinite", params?]` — a prefix-child of the standard key, so existing key-based invalidation automatically covers infinite queries.
