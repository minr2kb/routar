# @routar/react-query

## 1.4.1

### Patch Changes

- 4363684: Fix broken external install: `@routar/react-query` declared its runtime
  dependency on `@routar/core` using the `workspace:*` protocol, which
  `bun x changeset publish` did not rewrite to a real version. The published
  `1.4.0` therefore shipped `"@routar/core": "workspace:*"`, which npm/yarn/pnpm
  cannot resolve — `npm install @routar/react-query` failed for external users.

  The dependency is now a publishable semver range (`^1.4.x`). Bun still links the
  local workspace package during development, changesets bumps the range on each
  release (fixed group + `updateInternalDependencies`), and the published manifest
  carries a valid range.

  - @routar/core@1.4.1

## 1.4.0

### Minor Changes

- 6929893: Add `@routar/react-query`: derive TanStack Query `queryOptions`/`mutationOptions` factories from a routar API client via `createQueries(api)`, with declarative invalidation through `routarMutationCache`. The router is not re-passed — `createApi` now stamps it on the client's non-enumerable `$router` property, and `createQueries` recovers it.

  `@routar/core` changes (all backward-compatible): `endpoint()` preserves the literal `method` type; `createApi` returns `ApiClientWithRouter` (the client carries its source router on `$router`, excluded from `ApiTypes`); both `ApiClient` and `ApiClientWithRouter` types are exported.

  Additional `@routar/react-query` features: `createQueries(api, { defaults })` accepts per-endpoint default options (merged before per-call options; the map mirrors the router shape, so nested routers are supported); in development, a one-time `console.warn` is emitted when `invalidates` is declared on a mutation but no `routarMutationCache` is wired into the `QueryClient`; calling `getList()` and `getList({})` produce identical query keys (empty-param normalization).

  Every GET query accessor now has an `.infinite(params?, override?)` member that returns a native TanStack `infiniteQueryOptions` object. The pagination contract (`initialPageParam`, `getNextPageParam`, and the routar-specific `pageParam` builder) is declared once in `createQueries({ infinite: { <endpoint>: { ... } } })` — call sites then only pass base params. The `pageParam` builder maps the page param to a partial request (deep-merged into base params, replaces `queryFn`). A partial override can be passed as the second arg (call wins). If no config exists and no full contract is supplied, a runtime error is thrown. Key shape: `[...root, endpointName, "infinite", params?]` — a prefix-child of the standard key, so existing key-based invalidation automatically covers infinite queries.

### Patch Changes

- Updated dependencies [6929893]
  - @routar/core@1.4.0
