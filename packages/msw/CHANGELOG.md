# @routar/msw

## 1.8.0

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

## 1.5.0

## 1.4.2

## 1.4.1

## 1.4.0

## 1.3.0

### Minor Changes

- Updated dependency `@routar/core` to `1.3.0`.

## 1.2.1

### Patch Changes

- 8aa150a: Expand JSDoc `@example` blocks for `endpoint()`, `createApi()`, `createFetchExecutor()`, `withTimeout()`, and `createMswHandlers()` to improve IDE suggestions in Copilot and Cursor.
- Updated dependencies [8aa150a]
  - @routar/core@1.2.1

## 1.2.0

### Minor Changes

- b314358: Move fetch executor into core. `createFetchExecutor` and `HttpError` are now exported directly from `@routar/core` — no separate package needed for native fetch support. The `@routar/fetch` package is deprecated and re-exports from core for backward compatibility.

### Patch Changes

- Updated dependencies [b314358]
  - @routar/core@1.2.0
