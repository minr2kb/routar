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
  core/         @routar/core         — endpoint definitions, router, API client factory, plugin system, fetch-based Executor
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
- **`endpoint()` has 4 overloads: 2 no-request** (adapter×) **+ 2 request-bucket-map** (adapter×). `request` is **always** a `{ path?, query?, body? }` bucket-map of standalone validators — the envelope `request: z.object({…})` form was **removed** (the bucket-map is the only form). All return types have `request` and `adapter` as required (not optional) fields. This is intentional — `| undefined` in return types breaks downstream conditional type inference in `createApi`. The bucket overloads synthesize the stored `request` as a single composed `Validator<BucketRequestOutput<…>>` (never a union), so `EndpointFn`'s `TSpec["request"] extends Validator<infer R>` detection keeps working. The removed top-level `pathParams`/`query`/`body` fields are rejected at compile time via a `NoLegacyBuckets` (`{ pathParams?: never; query?: never; body?: never }`) intersection on the no-request overloads, so the old form is a hard error instead of silently dropping validation.
- **`AnyValidator` accepts `.parse` OR Standard Schema (SE-11).** `AnyValidator<T> = Validator<T> | StandardSchemaV1<unknown, T>`. `EndpointSpec` request/response are `AnyValidator`. Runtime validation goes through `runValidator` (prefers sync `.parse`, else `~standard.validate`). The `StandardSchemaV1` type is **vendored** (`standard-schema.ts`) to keep core zero-dependency — do not add `@standard-schema/spec`.
- **`buildClient` is recursive.** When a `RouterEndpoints` value has `prefix` + `endpoints` keys it is treated as a nested `RouterDef` and `buildClient` recurses with `joinPaths(prefix, nested.prefix)`.
- **`createApi` stamps the source router on the client's non-enumerable `$router` property** (return type `ApiClientWithRouter`). `@routar/react-query`'s `createQueries(api)` recovers prefix + endpoint `method`s from it, so the router is never re-passed. `$router` is `$`-prefixed (no endpoint-name collision) and excluded from `ApiTypes`; don't break this contract.
- **DTS build requires `ignoreDeprecations: '6.0'`** in `tsup.config.ts` (not in tsconfig). tsup internally injects `baseUrl` which TypeScript 6.x treats as deprecated.

### `packages/core/src/` file map

| File | Purpose |
|------|---------|
| `types.ts` | All shared interfaces and types (`ExecuteOptions`, `Executor`, `EndpointSpec`, `RouterDef`, `RouterEntry`, `ApiTypes`, `AnyValidator`, `ValidationMode`, `ValidationErrorContext`, `EndpointCallOptions`, …) |
| `standard-schema.ts` | Vendored `StandardSchemaV1` interface (SE-11) — keeps core dependency-free |
| `define-endpoint.ts` | `endpoint()` helper — 2 no-request + 2 request-bucket-map overloads (`request` is a `{ path?, query?, body? }` validator-map; envelope form removed) + `PathParams<TPath>` template literal type + `NoLegacyBuckets` guard |
| `define-router.ts` | `defineRouter(prefix, endpoints)` — groups specs under a prefix |
| `create-executor.ts` | `createExecutor(execute, options?)` + `dispatchExecutor` — wraps a transport function with `options.plugins` (converted to a middleware chain via `reduceRight`) |
| `create-fetch-executor.ts` | `createFetchExecutor(baseURL, options?)` + `HttpError` — native fetch transport |
| `create-api.ts` | `createApi(executor, router)` — typed client; per-call options + per-call timeout (`executeWithTimeout`/`combineSignals`); `validate` modes (`true`/`false`/`'warn'`) via `validateMode` |
| `middleware.ts` | `definePlugin`, `logger`, `TimeoutError` (public exports) + `withRetry`, `withTimeout` (internal helpers) — `ExecutorPlugin` lifecycle hooks (`onRequest`/`onResponse`/`onError`) |
| `utils/path.ts` | `joinPaths`, `resolvePath` (`:param` substitution) |
| `utils/params.ts` | `serializeParams` → `URLSearchParams` |
| `utils/validate.ts` | `ValidationError`, `StandardSchemaError` |
| `utils/run-validator.ts` | `runValidator(validator, data)` — validate-or-throw for `.parse` **or** `~standard` (shared by createApi + `@routar/msw`) |
| `utils/compose-request.ts` | `composeRequest(buckets)` — composes the `{ path?, query?, body? }` request buckets into an envelope `request` validator (carries Zod-like `.shape` for flatten) |

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
- Query accessors: `<domain>Query.<endpoint>(params?, options?)` returns `queryOptions` (GET endpoints, **or** non-GET endpoints promoted via `queryEndpoints`)
- Mutation accessors: `<domain>Query.<endpoint>(options?)` returns `mutationOptions` (non-GET endpoints)
- POST-as-query (SE-9): `createQueries(api, { queryEndpoints: { search: true } })` promotes a non-GET endpoint to a query accessor (request body is part of the query key); the map mirrors the router shape and the promoted endpoint also exposes `.infinite`
- `routarQueryClient(config?)` (SE-8): returns a `QueryClient` with `routarMutationCache` self-wired — removes the `let queryClient; queryClient = new QueryClient({ mutationCache: routarMutationCache(() => queryClient) })` boilerplate
- Key helpers: `<domain>Query.<endpoint>.queryKey(params?)` / `<domain>Query.<endpoint>.mutationKey` / `<domain>Query.$key` (domain root)
- Per-endpoint defaults: `createQueries(api, { defaults: { getList: { staleTime: 60_000 } } })` — merged before per-call options (per-call wins); nested routers supported (the map mirrors the router shape). Each default value may be a static object or a function `(params, q) => options` (dynamic defaults) — `q` is the fully-built queries object (use its key helpers for `invalidates`), `params` is the call params for a query accessor or `undefined` for a mutation accessor. The old external factory form `createQueries(api, (q) => options)` was removed in favor of this `(params, q)` default form
- Flatten: `createQueries(api, { flatten: true })` — accessors take flat params (union of the request's `path`/`query`/`body` fields) instead of the `{ path, query, body }` envelope; call-site convenience only (HTTP contract + keys stay envelope-based, so SSR/CSR keys match); endpoints with colliding buckets or non-object `body` fall back to the envelope
- Server pages: `prefetchQuery(<domain>Query.<endpoint>(params))` → `HydrationBoundary` → `<Suspense>`
- Client components: `useSuspenseQuery(<domain>Query.<endpoint>(params))` — `data` always non-nullable
- Multiple queries: `useSuspenseQueries({ queries: [...] })`
- Infinite queries (GET-only): declare the pagination contract once in `createQueries({ infinite: { <ep>: { initialPageParam, getNextPageParam, pageParam } } })` — nested routers supported (the map mirrors the router shape); call `<domain>Query.<ep>.infinite(params?)` at the call site (base params only); the routar-specific `pageParam` builder `(page) => partialRequest` maps the page param to a partial request (deep-merged into base params, replaces `queryFn`); key gets an `"infinite"` segment: `[...root, endpointName, "infinite", params?]` (prefix-child of the standard key — standard-key invalidation also covers it)
- Invalidation: pure by default; opt-in `invalidates: [<domain>Query.<endpoint>.queryKey()]` (prefer narrow scope) or `[<domain>Query.$key]` (whole domain — costly, use sparingly) requires `routarMutationCache` wired in `QueryClient`; without wiring, `invalidates` does nothing

**Shared contract pattern (todo):** `TodoRawSchema` exported from `services/todo.ts` is imported by Route Handlers — same Zod schema validates both the server response and the client parse.

### PathParams enforcement

`endpoint()` enforces at compile time that if `path` contains `:param` segments, `request.path` must be present with matching keys:

```ts
// ❌ compile error — ':id' in path but request.path missing
endpoint({ path: '/:id', request: { query: z.object({}) }, response: Schema })
```

This uses the `PathParams<TPath>` template literal type and the `BucketRequestMap` helper, which makes `request.path` a required key (and constrains its validator to cover every `:param`) when `PathParams<TPath>` is non-`never`.

### Executor pattern

`@routar/axios` and `@routar/ky` all call `createExecutor(transportFn, options?)` internally (forwarding their `CreateExecutorOptions`, i.e. `options.plugins`). `createFetchExecutor` lives in `@routar/core` and also uses this pattern. `createFetchExecutor`'s `baseURL` accepts `string | (() => string | Promise<string>)` — when a factory is passed it is resolved per-request inside the transport fn (`typeof baseURL === 'function' ? await baseURL() : baseURL`), so the origin can depend on the runtime environment (SSR vs CSR) without a second executor. `createAxiosExecutor` accepts `AxiosInstance | (() => AxiosInstance | Promise<AxiosInstance>)` — discrimination uses `'interceptors' in input && typeof input.request === 'function'` duck-typing because `AxiosInstance` is callable and `typeof` cannot distinguish it from a factory. `createKyExecutor` uses the same `InstanceOrFactory` pattern — discrimination uses `'extend' in input` duck-typing because `KyInstance` always has `.extend()` while plain factory functions do not. ky route URLs have their leading `/` stripped before being passed to ky (ky's `prefixUrl` requires relative paths).

**Transport error normalization (SE-4).** Every executor normalizes HTTP failures to `HttpError`. `createAxiosExecutor` and `createKyExecutor` wrap their transport call in try/catch: an `AxiosError` with a `response` (resp. a ky `HTTPError`) is re-thrown as `new HttpError(status, statusText, body, originalError)` — the original transport error lives on `HttpError.cause` (added as a 4th constructor arg, passed to `super(msg, { cause })`). Errors with no response (network failures, cancellations) re-throw unchanged. This keeps `onError` plugins and callers transport-agnostic (`instanceof HttpError` works everywhere). `onError` MUST always throw — its return value is ignored.

### Validator compatibility

Any object with a `.parse(data: unknown): T` method works as a `Validator<T>` (Zod, Valibot, Yup, or a hand-rolled object). Additionally, any **Standard Schema** (`~standard` — ArkType, Zod 3.24+, Valibot, …) works via `AnyValidator` (SE-11). At runtime `runValidator` prefers `.parse` (sync) and falls back to `~standard.validate` (sync/async); Standard Schema issues are thrown as `StandardSchemaError` and wrapped in `ValidationError` (original on `.cause`).

### Validation modes & per-call options (SE-7, SE-10)

- `createApi(executor, router, { validate, onValidationError })`. `validate` is `boolean | 'warn' | { request?, response? }` (each a `ValidationMode = boolean | 'warn'`). `'warn'` passes raw data through and calls `onValidationError(err, { kind, method, url, data })` instead of throwing — drift observation without an outage.
- Endpoint call signature: `fn(params, signalOrOptions?)` where the 2nd arg is `AbortSignal | { signal?, headers?, timeout? }` (bare signal stays valid). Per-call `headers` merge over executor defaults (plugin `onRequest` runs after, wins on key collision); per-call `timeout` aborts with `TimeoutError` at the core level (works on every executor).

### Request buckets (`request` is a bucket-map)

`request` is **always** a plain `{ path?, query?, body? }` map of standalone validators — there is no single-validator envelope form (the `request: z.object({…})` form was **removed** (the bucket-map is the only form)). `endpoint()`'s runtime impl folds the buckets into a composed envelope `request` validator via `composeRequest` (carrying a Zod-like `.shape`), so createApi, query keys, react-query flatten, and MSW all read the canonical `{ path, query, body }` shape. `request.path` is required when `path` has `:param` segments. The legacy top-level `pathParams`/`query`/`body` fields are a compile error (`NoLegacyBuckets` guard), not silently dropped.

---

## 하네스: routar 라이브러리 개발

**목표:** `@routar/*` 패키지의 기능/버그/리팩터/API 변경을 설계→구현→타입검수→문서·예제 전파→문서 동기화→릴리스 게이트까지 일관된 규율로 조율한다.

**트리거:** routar 패키지 코드·타입·executor·미들웨어/플러그인·`apps/docs` 문서·`apps/example` 예제 작업을 요청하거나, 작업을 재실행·부분 수정·보완하려 할 때 `routar-harness` 스킬을 사용하라. 단순 개념·사용법 질문은 직접 응답 가능.

**핵심 규율 (요약):**
- **push 전 반드시 사용자 승인** + 로컬 CI(`scripts/local-ci.sh` = typecheck·test·build) 통과 필수. `.husky/pre-push`가 강제. (`release-gate`)
- **작업 분할:** 작으면 subagent, 피쳐 단위면 Superset 워크스페이스 분리(`superset workspaces create --agent claude`). (`work-splitting`)
- **모든 작업은 `docs/worklog/`에 상시 기록.** (`doc-propagation`)
- **패키지 스펙 변경 → `apps/docs/content`(en·ko)·`apps/example` 전파 → llms.txt·llms-full.txt·AGENTS.md·CLAUDE.md·README(.ko).md 동기화.** (`doc-propagation`, `doc-sync`)
- **타입 규율:** `any/unknown/never`는 설계 의도 있을 때만, 예외는 사유 코멘트. 깊은 추론 우선. (`type-discipline`)

에이전트/스킬 상세는 `.claude/agents/`, `.claude/skills/`와 `routar-harness` 스킬에서 관리한다.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-03 | 초기 구성 (에이전트 6 + 스킬 6 + 로컬 CI 게이트) | 전체 | 라이브러리 개발 하네스 신규 구축 |
