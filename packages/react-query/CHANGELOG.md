# @routar/react-query

## 1.8.2

### Patch Changes

- 5a2ce18: Fix `flatten: true` losing query parameters when the query bucket schema uses `.optional()`.

  Two bugs were fixed:

  - **Type-level**: `Flatten<R>`, `HasOverlap`, and `BodyFlattenable` used `R extends { query: infer Q }` conditional patterns, which only match _required_ properties. An optional query bucket (`{ query?: T }` produced by `z.object({…}).optional()`) never matched, so the flat accessor type collapsed to `{}` — TypeScript accepted calls without `userId` even when it was required.

  - **Runtime**: `getShape` in the flatten utility did not unwrap `ZodOptional` wrappers, so `collectKeys` returned `[]` for any `.optional()` query schema. `toEnvelope` then omitted the query field entirely from the assembled envelope, silently dropping all query params from the actual HTTP call.

  Fix replaces the `infer`-based patterns with direct property indexing (`GetBucket<R, K>` + `NonNullable`) in `types.ts`, and adds `.unwrap()` fallback support to `getShape` in `flatten.ts`.

  - @routar/core@1.8.2

## 1.8.1

### Patch Changes

- f36a48d: Refactor `queryKey` and `mutationKey` generation to use the endpoint's `path` instead of its `name`. This is a breaking change for users relying on the previous key structure for manual invalidation.
  - @routar/core@1.8.1

## 1.8.0

### Patch Changes

- Updated dependencies [c1215d4]
  - @routar/core@1.8.0

## 1.7.0

### Minor Changes

- e3c8755: Interface improvements (SE-7 ~ SE-12) — all additive and non-breaking.

  **@routar/core**

  - **`validate: 'warn'` mode + `onValidationError` hook (SE-7)** — observe schema drift without turning it into an outage. `validate` now accepts `'warn'` (per-bucket too: `{ request: true, response: 'warn' }`); on failure the raw data passes through and `onValidationError(error, ctx)` is called instead of throwing. `ctx` carries `{ kind, method, url, data }`.
  - **Per-call options channel (SE-10)** — the optional second endpoint argument now accepts `{ signal, headers, timeout }` in addition to a bare `AbortSignal` (backward compatible). Per-call `headers` are merged over executor defaults; `timeout` aborts the request with `TimeoutError` (transport-agnostic, works on every executor).
  - **Standard Schema support (SE-11)** — validators may now be [Standard Schema](https://standardschema.dev) (`~standard`, e.g. ArkType) in addition to any object with `.parse()` (Zod, Valibot, Yup). New `AnyValidator<T>`, vendored `StandardSchemaV1` type (zero new dependencies), `StandardSchemaError`, and a `runValidator` helper (exported for executor/mock authors).
  - **Separated request buckets (SE-12)** — `endpoint()` now also accepts `pathParams` / `query` / `body` as separate validators instead of a wrapped `request` envelope. Composed internally into the same envelope, so call sites, keys, react-query flatten, and MSW behave identically. The envelope `request` form keeps working unchanged.

  **@routar/react-query**

  - **POST-as-query override (SE-9)** — `createQueries(api, { queryEndpoints: { search: true } })` promotes a non-GET endpoint (e.g. a POST search) to a query accessor, with the request body included in the query key. Mirrors the router shape; supports the `.infinite()` variant.
  - **`routarQueryClient()` helper (SE-8)** — creates a `QueryClient` with `routarMutationCache` already self-wired, removing the manual self-reference boilerplate. (The dev-time warning for unwired `invalidates` was already shipped.)

  **@routar/msw**

  - Request validation now accepts Standard Schema validators (via core's shared `runValidator`), consistent with `@routar/core`.

### Patch Changes

- Updated dependencies [e3c8755]
  - @routar/core@1.7.0

## 1.6.0

### Patch Changes

- Updated dependencies [b0925cb]
  - @routar/core@1.6.0

## 1.5.0

### Minor Changes

- 53a9e97: `createQueries`: dynamic per-endpoint defaults, opt-in flat params, and `defaults.invalidates` fixes.

  - **Feature**: per-endpoint `defaults` values may now be **functions** `(params, q) => options`, evaluated lazily against the fully-built `q`. Use the function form to reference sibling key helpers (e.g. `(_, q) => ({ invalidates: [q.getList.queryKey()] })`) without circular-variable issues — `params` is the call params for queries, or `undefined` for mutations. Priority is unchanged: static/dynamic default < per-call options.
  - **Feature**: new `flatten?: boolean` option. With `flatten: true`, accessors accept _flat_ params — the union of the request's `path`/`query`/`body` fields (`getDetail({ id })`) instead of the nested envelope (`getDetail({ path: { id } })`). Endpoints whose buckets collide on a key, or whose `body` isn't a plain object, transparently fall back to the envelope. The query key is always built from the envelope, so flat and envelope call styles converge (SSR/CSR keys match).
  - **Removed (unreleased)**: the `createQueries(api, (q) => options)` factory form. It was never published; the new dynamic `defaults` function form is a superset replacement (it also exposes `params`).
  - **Fix**: `defaults.create.invalidates` was spread as a top-level key instead of being routed to `meta.invalidates` where `routarMutationCache` reads it — now handled correctly.
  - **Fix**: `defaults.create.meta` was overwritten by call-site `meta` instead of merging — now deep-merged (default < call-site).
  - **Fix**: `invalidates` is now allowed in `EndpointDefaults` at the type level (the `Omit` was removed).

### Patch Changes

- @routar/core@1.5.0

## 1.4.2

### Patch Changes

- 16dade4: Fix `defaults.invalidates` silently ignored in mutation accessors, and add options factory form to `createQueries`.

  - **Fix**: `defaults.create.invalidates` was spread as a top-level key instead of being routed to `meta.invalidates` where `routarMutationCache` reads it — now handled correctly.
  - **Fix**: `defaults.create.meta` was overwritten by call-site `meta` instead of merging — now deep-merged (default < call-site).
  - **Fix**: `invalidates` is now allowed in `EndpointDefaults` at the type level (the `Omit` was removed).
  - **Feature**: `createQueries(api, options)` now accepts a factory `(q) => options` as its second argument, making it possible to reference sibling key helpers (e.g. `q.getList.queryKey()`) inside `defaults.invalidates` without circular-variable issues.
  - @routar/core@1.4.2

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
