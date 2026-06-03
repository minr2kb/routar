# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build all packages
bun run build

# Build a specific package
bun run --filter '@routar/core' build
bun run --filter '@routar/axios' build

# Run all tests
bun test

# Run a single test file
bun test packages/core/src/create-api.test.ts

# Type-check all packages (project references)
bun x tsc --build

# Type-check a specific package
bun x tsc -p packages/core/tsconfig.json --noEmit

# Watch mode (packages)
bun run --filter '@routar/core' dev
```

After modifying a package, rebuild it before running the web app — the web app imports from `dist/`.

---

## Architecture

This is a monorepo (Bun workspaces) with three library packages and one demo app.

```
packages/
  core/         @routar/core         — endpoint definitions, router, API client factory, middleware system, fetch-based Executor
  axios/        @routar/axios        — Axios-based Executor
  msw/          @routar/msw          — MSW v2 handler factory (createMswHandlers)
  ky/           @routar/ky           — ky-based Executor
  react-query/  @routar/react-query  — TanStack Query bindings (createQueries, routarMutationCache)
apps/
  example/  @routar/example  — Next.js 15 demo app consuming all packages
```

### Core data flow

```
endpoint() → defineRouter() → createApi(executor, router) → typed API client
                                                               ├─ request.parse(params)
                                                               ├─ resolvePath(prefix + path, pathParams)
                                                               ├─ executor.execute(opts)  ← HTTP
                                                               ├─ response.parse(raw)
                                                               └─ adapter(validated)      ← optional transform
```

### Key design rules (internalized from design-decisions.md)

- **`response` + `adapter` are always separate.** `response` is a pure Zod schema (stays a `ZodObject`, can be composed). `adapter` is a plain function that transforms the validated response. Never put `.transform()` on a response schema.
- **`RouterEndpoints` uses `any` generics intentionally.** `Record<string, EndpointSpec<any, any, any> | RouterDef<any>>` — the `any`s are not a mistake; they allow adapter functions typed to specific response shapes to be assignable without contravariance issues.
- **`endpoint()` has 4 overloads** (request×adapter). All return types have `request` and `adapter` as required (not optional) fields. This is intentional — `| undefined` in return types breaks downstream conditional type inference in `createApi`.
- **`buildClient` is recursive.** When a `RouterEndpoints` value has `prefix` + `endpoints` keys it is treated as a nested `RouterDef` and `buildClient` recurses with `joinPaths(prefix, nested.prefix)`.
- **`createApi` stamps the source router on the client's non-enumerable `$router` property** (return type `ApiClientWithRouter`). `@routar/react-query`'s `createQueries(api)` recovers prefix + endpoint `method`s from it, so the router is never re-passed. `$router` is `$`-prefixed (no endpoint-name collision) and excluded from `ApiTypes`; don't break this contract.
- **DTS build requires `ignoreDeprecations: '6.0'`** in `tsup.config.ts` (not in tsconfig). tsup internally injects `baseUrl` which TypeScript 6.x treats as deprecated.

### `packages/core/src/` file map

| File | Purpose |
|------|---------|
| `types.ts` | All shared interfaces and types (`ExecuteOptions`, `Executor`, `EndpointSpec`, `RouterDef`, `RouterEntry`, `ApiTypes`, …) |
| `define-endpoint.ts` | `endpoint()` helper with 4 overloads + `PathParams<TPath>` template literal type |
| `define-router.ts` | `defineRouter(prefix, endpoints)` — groups specs under a prefix |
| `create-executor.ts` | `createExecutor(execute, middlewares?)` — wraps a transport function with a middleware chain via `reduceRight` |
| `create-fetch-executor.ts` | `createFetchExecutor(baseURL, options?)` + `HttpError` — native fetch transport |
| `create-api.ts` | `createApi(executor, router)` — produces a typed client; `buildClient` recurses for nested routers |
| `middleware.ts` | `defineMiddleware`, `withRetry`, `withTimeout`, `withLogger` |
| `utils/path.ts` | `joinPaths`, `resolvePath` (`:param` substitution) |
| `utils/params.ts` | `serializeParams` → `URLSearchParams` |
| `utils/validate.ts` | `ValidationError` |

### `apps/example` structure

```
app/
  api/todos/        local Route Handlers (GET/POST + GET/PATCH/DELETE /:id)
  api/todos/_store.ts  in-memory store seeded via globalThis (survives hot-reload)
  (pages)/          server components: prefetchQuery → HydrationBoundary → <Suspense>
  providers.tsx     QueryClientProvider with useState (never pass QueryClient across boundary)
  layout.tsx        root layout wrapping with Providers
utils/
  get-query-client.ts  isServer-based singleton — fresh per request on server, stable on client
remote/
  lib/executor.ts   clientExecutor (axios+interceptors, CSR) + fetchExecutor (fetch+cookies, SSR)
                    localClientExecutor + localFetchExecutor (→ NEXT_PUBLIC_APP_URL)
  services/
    <domain>.ts          one file per domain: defineRouter + endpoint() + createApi
                         + createQueries (TanStack Query helpers) + ApiTypes export
components/
  *Client.tsx       client components using useSuspenseQuery / useSuspenseQueries
```

**TanStack Query patterns (`@routar/react-query`):**
- `services/<domain>.ts` exports `export const <domain>Query = createQueries(<domain>Api)` alongside the api client — the single source of truth for keys + queryFn/mutationFn
- Query accessors: `<domain>Query.<endpoint>(params?, options?)` returns `queryOptions` (GET endpoints)
- Mutation accessors: `<domain>Query.<endpoint>(options?)` returns `mutationOptions` (non-GET endpoints)
- Key helpers: `<domain>Query.<endpoint>.queryKey(params?)` / `<domain>Query.<endpoint>.mutationKey` / `<domain>Query.$key` (domain root)
- Per-endpoint defaults: `createQueries(api, { defaults: { getList: { staleTime: 60_000 } } })` — merged before per-call options (per-call wins); nested routers supported (the map mirrors the router shape)
- Server pages: `prefetchQuery(<domain>Query.<endpoint>(params))` → `HydrationBoundary` → `<Suspense>`
- Client components: `useSuspenseQuery(<domain>Query.<endpoint>(params))` — `data` always non-nullable
- Multiple queries: `useSuspenseQueries({ queries: [...] })`
- Infinite queries (GET-only): declare the pagination contract once in `createQueries({ infinite: { <ep>: { initialPageParam, getNextPageParam, pageParam } } })` — nested routers supported (the map mirrors the router shape); call `<domain>Query.<ep>.infinite(params?)` at the call site (base params only); the routar-specific `pageParam` builder `(page) => partialRequest` maps the page param to a partial request (deep-merged into base params, replaces `queryFn`); key gets an `"infinite"` segment: `[...root, endpointName, "infinite", params?]` (prefix-child of the standard key — standard-key invalidation also covers it)
- Invalidation: pure by default; opt-in `invalidates: [<domain>Query.<endpoint>.queryKey()]` (prefer narrow scope) or `[<domain>Query.$key]` (whole domain — costly, use sparingly) requires `routarMutationCache` wired in `QueryClient`; without wiring, `invalidates` does nothing

**Shared contract pattern (todo):** `TodoRawSchema` exported from `services/todo.ts` is imported by Route Handlers — same Zod schema validates both the server response and the client parse.

### PathParams enforcement

`endpoint()` enforces at compile time that if `path` contains `:param` segments, `request` must include a `path` field with matching keys:

```ts
// ❌ compile error — ':id' in path but request.path.id missing
endpoint({ path: '/:id', request: z.object({ query: z.object({}) }), response: Schema })
```

This uses the `PathParams<TPath>` template literal type and `PathConstraint<TPath>` intersection on `TRequest`.

### Executor pattern

`@routar/axios` and `@routar/ky` all call `createExecutor(transportFn, middlewares?)` internally. `createFetchExecutor` lives in `@routar/core` and also uses this pattern. `createAxiosExecutor` accepts `AxiosInstance | (() => AxiosInstance | Promise<AxiosInstance>)` — discrimination uses `'interceptors' in input && typeof input.request === 'function'` duck-typing because `AxiosInstance` is callable and `typeof` cannot distinguish it from a factory. `createKyExecutor` uses the same `InstanceOrFactory` pattern — discrimination uses `'extend' in input` duck-typing because `KyInstance` always has `.extend()` while plain factory functions do not. ky route URLs have their leading `/` stripped before being passed to ky (ky's `prefixUrl` requires relative paths).

### Validator compatibility

Any object with a `.parse(data: unknown): T` method works as a `Validator<T>`. Zod, Valibot, Yup, or a hand-rolled object all satisfy the interface.
