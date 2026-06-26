# @routar/core

## 1.8.1

## 1.8.0

### Minor Changes

- c1215d4: **`endpoint()` `request` is now a single `{ path?, query?, body? }` bucket-map** (interface change).

  The two earlier ways of declaring a request — the `request: z.object({ path, query, body })` **envelope** and the top-level `pathParams` / `query` / `body` **separated buckets** (SE-12) — are both removed in favor of one canonical form: `request` as a plain map of standalone validators.

  ```ts
  // before — envelope (removed)
  endpoint({
    method: "GET",
    path: "/:id",
    request: z.object({
      path: z.object({ id: z.number() }),
      query: z.object({ q: z.string() }),
    }),
    response: TodoSchema,
  });

  // before — top-level separated buckets, SE-12 (removed)
  endpoint({
    method: "GET",
    path: "/:id",
    pathParams: z.object({ id: z.number() }),
    query: z.object({ q: z.string() }),
    response: TodoSchema,
  });

  // after — request is a { path, query, body } bucket-map
  endpoint({
    method: "GET",
    path: "/:id",
    request: {
      path: z.object({ id: z.number() }),
      query: z.object({ q: z.string() }),
    },
    response: TodoSchema,
  });
  ```

  - Each bucket (`path` / `query` / `body`) is its own validator — any `.parse()` object or Standard Schema. routar composes them into the same envelope internally, so HTTP contract, query keys, react-query flatten, and MSW behavior are unchanged.
  - The path-params bucket is keyed `path` (was `pathParams` in SE-12). `request.path` is required when `path` has `:param` segments.
  - The removed forms are **compile errors**, not silently dropped: a top-level `pathParams` / `query` / `body` is rejected by a `NoLegacyBuckets` guard, and `request: z.object(...)` no longer matches any overload — so migration surfaces every call site instead of losing request validation at runtime.

  **Migration:** unwrap `request: z.object({ … })` → `request: { … }`, and move any top-level `pathParams` / `query` / `body` into `request` (renaming `pathParams` → `path`).

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

## 1.6.0

### Minor Changes

- b0925cb: Executor improvements: error normalization, baseURL factory, and unwrap option

  - **HttpError normalization (SE-4)**: All executors now normalize transport errors to `HttpError` before calling `onError` plugins. `AxiosError` and ky `HTTPError` are caught inside each executor and re-thrown as `HttpError` with `status`, `statusText`, and `body` populated. The original error is preserved on `cause`. Plugins and callers can now use a single `instanceof HttpError` check regardless of transport.

  - **HttpError enrichment**: `HttpError` now includes `url` (full request URL) and `method` (HTTP method) fields for easier debugging and logging.

  - **`createFetchExecutor` baseURL factory (SE-5)**: `baseURL` now accepts a sync or async factory `() => string | Promise<string>` in addition to a plain string. The factory is called per-request, enabling dynamic base URLs (e.g. SSR vs CSR environment detection).

  - **`unwrap` option (SE-6)**: `CreateExecutorOptions` (and thus all executors) now accept an `unwrap: (raw: unknown) => unknown` option. It runs on the raw response before schema validation — a first-class alternative to writing a `definePlugin({ onResponse })` for envelope unwrapping.

## 1.5.0

## 1.4.2

## 1.4.1

## 1.4.0

### Minor Changes

- 6929893: Add `@routar/react-query`: derive TanStack Query `queryOptions`/`mutationOptions` factories from a routar API client via `createQueries(api)`, with declarative invalidation through `routarMutationCache`. The router is not re-passed — `createApi` now stamps it on the client's non-enumerable `$router` property, and `createQueries` recovers it.

  `@routar/core` changes (all backward-compatible): `endpoint()` preserves the literal `method` type; `createApi` returns `ApiClientWithRouter` (the client carries its source router on `$router`, excluded from `ApiTypes`); both `ApiClient` and `ApiClientWithRouter` types are exported.

  Additional `@routar/react-query` features: `createQueries(api, { defaults })` accepts per-endpoint default options (merged before per-call options; the map mirrors the router shape, so nested routers are supported); in development, a one-time `console.warn` is emitted when `invalidates` is declared on a mutation but no `routarMutationCache` is wired into the `QueryClient`; calling `getList()` and `getList({})` produce identical query keys (empty-param normalization).

  Every GET query accessor now has an `.infinite(params?, override?)` member that returns a native TanStack `infiniteQueryOptions` object. The pagination contract (`initialPageParam`, `getNextPageParam`, and the routar-specific `pageParam` builder) is declared once in `createQueries({ infinite: { <endpoint>: { ... } } })` — call sites then only pass base params. The `pageParam` builder maps the page param to a partial request (deep-merged into base params, replaces `queryFn`). A partial override can be passed as the second arg (call wins). If no config exists and no full contract is supplied, a runtime error is thrown. Key shape: `[...root, endpointName, "infinite", params?]` — a prefix-child of the standard key, so existing key-based invalidation automatically covers infinite queries.

## 1.3.0

### Minor Changes

- Replace middleware system with plugin API. `createExecutor` now accepts `{ plugins }` option with `ExecutorPlugin` objects (`onRequest` / `onResponse` / `onError` hooks). Add `definePlugin` and `logger` helpers. `retry` and `timeout` remain as options on `createFetchExecutor`.

## 1.2.1

### Patch Changes

- 8aa150a: Expand JSDoc `@example` blocks for `endpoint()`, `createApi()`, `createFetchExecutor()`, `withTimeout()`, and `createMswHandlers()` to improve IDE suggestions in Copilot and Cursor.

## 1.2.0

### Minor Changes

- b314358: Move fetch executor into core. `createFetchExecutor` and `HttpError` are now exported directly from `@routar/core` — no separate package needed for native fetch support. The `@routar/fetch` package is deprecated and re-exports from core for backward compatibility.

## 1.1.0

### Minor Changes

- Add TimeoutError class, fix AbortSignal listener leak in withTimeout, improve HttpError with body field, fix RouterDef discriminator, make endpoint params optional when no request schema, strengthen duck-typing for AxiosInstance detection, make ValidationError.cause non-enumerable, add TypeError for object query params, and fix header priority in fetch executor.

## 1.0.0

### Minor Changes

- 8aa9bde: Add `dispatchExecutor`, `validate` option for `createApi`, and nested `ApiTypes` support

  **`dispatchExecutor(resolver)`** — selects the underlying executor at request time based on any runtime condition (environment, URL prefix, auth context, etc.). Replaces the pattern of maintaining separate `*ServerApi` and `*ClientApi` instances.

  ```ts
  export const apiExecutor = dispatchExecutor(() =>
    typeof window === "undefined" ? serverExecutor : clientExecutor
  );
  export const todoApi = createApi(apiExecutor, todoRouter);
  ```

  **`validate` option on `createApi`** — controls whether request and response schemas are run on each call. Useful for skipping validation overhead in production while keeping it during development.

  ```ts
  // skip all validation
  createApi(executor, router, { validate: false });

  // keep request validation, skip response in prod
  createApi(executor, router, {
    validate: {
      request: true,
      response: process.env.NODE_ENV !== "production",
    },
  });
  ```

  **`ApiTypes` nested router support** — `ApiTypes<typeof api>` now recursively resolves nested router client types.

  ```ts
  type NestedTypes = ApiTypes<typeof api>;
  type Req = NestedTypes["users"]["todos"]["getList"]["request"];
  ```
