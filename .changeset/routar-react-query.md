---
"@routar/react-query": minor
"@routar/core": minor
---

Add `@routar/react-query`: derive TanStack Query `queryOptions`/`mutationOptions` factories from a routar API client via `createQueries(api)`, with declarative invalidation through `routarMutationCache`. The router is not re-passed — `createApi` now stamps it on the client's non-enumerable `$router` property, and `createQueries` recovers it.

`@routar/core` changes (all backward-compatible): `endpoint()` preserves the literal `method` type; `createApi` returns `ApiClientWithRouter` (the client carries its source router on `$router`, excluded from `ApiTypes`); both `ApiClient` and `ApiClientWithRouter` types are exported.
