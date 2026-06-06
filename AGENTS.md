# AGENTS.md — routar

Guidelines for AI agents (Claude Code, Copilot, Cursor, etc.) working in projects that use routar.

## What is routar?

routar is a schema-first HTTP API client library. You define endpoints once with Zod schemas and get a fully-typed, runtime-validated API client — no codegen, no OpenAPI spec required.

Packages:
- `@routar/core` — endpoint, router, createApi, plugin system, fetch executor
- `@routar/axios` — Axios executor
- `@routar/ky` — ky executor
- `@routar/msw` — MSW v2 mock handler factory (for testing)
- `@routar/react-query` — TanStack Query bindings (`createQueries`, `routarMutationCache`)

## Installation

```bash
# fetch (zero extra dependencies)
npm install @routar/core

# with Axios
npm install @routar/core @routar/axios axios

# for testing
npm install @routar/core msw
npm install --save-dev @routar/msw

# with TanStack Query (React)
npm install @routar/core @routar/react-query @tanstack/react-query
```

## Core Pattern

Every API follows this three-step setup:

```ts
import { z } from 'zod';
import { endpoint, defineRouter, createApi, createFetchExecutor } from '@routar/core';

// 1. Define schemas
const TodoSchema = z.object({ id: z.number(), title: z.string(), completed: z.boolean() });

// 2. Define endpoints and router
const todoRouter = defineRouter('/todos', {
  getList:   endpoint({ method: 'GET',  path: '/',    response: z.array(TodoSchema) }),
  getDetail: endpoint({ method: 'GET',  path: '/:id', response: TodoSchema,
                        request: z.object({ path: z.object({ id: z.number() }) }) }),
  create:    endpoint({ method: 'POST', path: '/',    response: TodoSchema,
                        request: z.object({ body: z.object({ title: z.string() }) }) }),
});

// 3. Create executor and API client
const todoApi = createApi(createFetchExecutor('https://api.example.com'), todoRouter);

// Fully-typed calls
const todos = await todoApi.getList({});
const todo  = await todoApi.getDetail({ path: { id: 1 } });
const next  = await todoApi.create({ body: { title: 'buy milk' } });
```

## Executor Selection

| Situation | Recommended |
|-----------|-------------|
| SSR (Next.js Server Components) | `createFetchExecutor` with `defaultHeaders` factory |
| CSR (browser only) | `createAxiosExecutor` or `createFetchExecutor` |
| SSR + CSR (same client) | `dispatchExecutor(() => isServer ? serverEx : clientEx)` |
| Testing | `createMswHandlers` with MSW |

```ts
// SSR + CSR with dispatchExecutor — one API client works everywhere
import { dispatchExecutor } from '@routar/core';

export const apiExecutor = dispatchExecutor(() =>
  typeof window === 'undefined' ? serverExecutor : clientExecutor,
);

export const todoApi = createApi(apiExecutor, todoRouter);
```

## Key Patterns

### Path param enforcement

If `path` contains `:param`, `request.path` must have a matching key — compile error otherwise:

```ts
// ✅ correct
endpoint({
  method: 'GET', path: '/:id',
  request: z.object({ path: z.object({ id: z.number() }) }),
  response: TodoSchema,
});

// ❌ compile error — ':id' in path but request.path.id missing
endpoint({
  method: 'GET', path: '/:id',
  request: z.object({ query: z.object({ q: z.string() }) }),
  response: TodoSchema,
});
```

### response + adapter are always separate

`response` must be a plain Zod schema. Use `adapter` for transforms — never `.transform()` on a response schema:

```ts
// ✅ correct
endpoint({
  response: z.array(TodoRawSchema),
  adapter: (raw) => raw.map(toTodoItem), // raw is inferred, no cast needed
  // ...
});

// ❌ wrong — .transform() breaks schema composition
endpoint({
  response: z.array(TodoRawSchema).transform(items => items.map(toTodoItem)),
  // ...
});
```

### Nested routers

```ts
const apiRouter = defineRouter('/api', {
  todos: todoRouter,     // → /api/todos, /api/todos/:id
  users: userRouter,     // → /api/users, /api/users/:id
});

const api = createApi(executor, apiRouter);
await api.todos.getList({});
await api.users.getDetail({ path: { id: 1 } });
```

### Extracting types

```ts
import type { ApiTypes } from '@routar/core';

type TodoApiTypes  = ApiTypes<typeof todoApi>;
type Todo          = TodoApiTypes['getDetail']['response'];
type CreateRequest = TodoApiTypes['create']['request'];
```

### AbortSignal

```ts
const controller = new AbortController();
const todos = await todoApi.getList({}, controller.signal);
controller.abort(); // cancels in-flight request
```

## Testing with MSW

```ts
import { createMswHandlers } from '@routar/msw';
import { HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  ...createMswHandlers(todoRouter, 'https://api.example.com', {
    getList: () =>
      HttpResponse.json([{ id: 1, title: 'Buy milk', completed: false }]),
    getDetail: ({ params }) =>
      HttpResponse.json({ id: params.id, title: 'Buy milk', completed: false }),
    create: ({ body }) =>
      HttpResponse.json({ id: 2, title: body.title, completed: false }),
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Partial mocking** — only listed endpoints are intercepted; the rest pass through:

```ts
createMswHandlers(todoRouter, 'https://api.example.com', {
  getList: () => HttpResponse.json([]),
  // getDetail, create → not registered, requests reach the real server
});
```

**Important:** MSW path params are always strings. Use `z.coerce.number()` for numeric IDs:

```ts
request: z.object({ path: z.object({ id: z.coerce.number() }) }) // ✅ in MSW context
```

## TanStack Query (`@routar/react-query`)

`createQueries(api, options?)` turns a routar client into TanStack Query `queryOptions`/`mutationOptions` factories. The router is **not** re-passed — it is recovered from the client (`createApi` stamps it on `$router`). There is no new hook API: you keep using TanStack's own hooks. GET endpoints become query accessors, non-GET endpoints become mutation accessors (decided at the type level).

```ts
import { createQueries } from '@routar/react-query';

// todoApi is a createApi(...) client — createQueries reads its router automatically
export const todoQuery = createQueries(todoApi);

// queries — call the accessor, pass the result to any native hook
useSuspenseQuery(todoQuery.getList({ query: { userId: 1 } }));
useQuery(todoQuery.getDetail({ path: { id } }, { staleTime: 60_000 }));
queryClient.prefetchQuery(todoQuery.getList()); // SSR

// mutations — variables go to .mutate()
useMutation(todoQuery.create());
useMutation(todoQuery.update({ invalidates: [todoQuery.getList.queryKey()] }));
```

Signatures: query accessor `(params?, queryOptions?) => queryOptions`; mutation accessor `(options?) => mutationOptions`, where `options` also accepts `invalidates?: QueryKey[]`.

Keys: `todoQuery.<endpoint>.queryKey(params?)`, `todoQuery.<endpoint>.mutationKey`, `todoQuery.$key` (domain root). Shape is `[root, endpointName, params?]`; the root is derived from the router prefix (override with `createQueries(api, { key })`).

**Per-endpoint defaults:** pass `defaults` to set option defaults per endpoint name — merged before per-call options (per-call wins). Nested routers supported (the map mirrors the router shape). Mutation endpoints support all mutation options including `invalidates`. The second argument may be a factory `(q) => options` to reference sibling key helpers inside defaults:

```ts
createQueries(todoApi, { defaults: { getList: { staleTime: 60_000 }, getDetail: { staleTime: 5 * 60_000 } } })
// factory form — use when defaults.invalidates references sibling queryKeys
createQueries(todoApi, (q) => ({ defaults: { create: { invalidates: [q.getList.queryKey()] } } }))
```

**Error typing:** `error` is typed as TanStack's `DefaultError`. To narrow it to `HttpError` globally, augment `Register` once — no `createQueries` change needed:

```ts
import type { HttpError } from '@routar/core';
declare module '@tanstack/react-query' { interface Register { defaultError: HttpError } }
```

**Infinite queries (GET-only):** declare the pagination contract once in `createQueries({ infinite: { <endpoint>: { initialPageParam, getNextPageParam, pageParam } } })` — nested routers supported (the map mirrors the router shape). The routar-specific `pageParam` builder maps the page param to a partial request (deep-merged into base params before the routar client is called) — this replaces `queryFn`. Call sites then only need base params; supply the full contract as the second arg only for ad-hoc use. Key: `[...root, endpointName, "infinite", params?]` — a prefix-child of the standard key, so standard-key invalidation also covers it.

```ts
// Declare contract in createQueries
export const todoQuery = createQueries(todoApi, {
  infinite: {
    getList: {
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => lastPage.length === 10 ? allPages.length + 1 : undefined,
      pageParam: (page) => ({ query: { _page: page } }),
    },
  },
});

// Call site — base params only
useSuspenseInfiniteQuery(todoQuery.getList.infinite({ query: { _limit: 10 } }));
queryClient.prefetchInfiniteQuery(todoQuery.getList.infinite()); // SSR
```

### Invalidation (pure by default)

Mutations invalidate nothing unless you ask. Declare target keys with `invalidates` and wire `routarMutationCache` once at `QueryClient` creation — **without this wiring `invalidates` does nothing**. In development, a one-time `console.warn` is logged if `invalidates` is declared without the wiring.

```ts
import { QueryClient } from '@tanstack/react-query';
import { routarMutationCache } from '@routar/react-query';

let queryClient: QueryClient;
queryClient = new QueryClient({
  mutationCache: routarMutationCache(() => queryClient),
});
```

Prefer **narrow invalidation** — use `todoQuery.getList.queryKey()` (specific key) rather than `todoQuery.$key` (whole domain). Reserve `$key` only when a mutation truly invalidates every query in the domain; it refetches all active lists and details.

Without this wiring, `invalidates` is ignored — handle invalidation in a native `onSuccess` instead.

### Optimistic updates

Accessor options are merged, so pass native `onMutate`/`onError`/`onSettled`; the key helpers make `cancelQueries`/`setQueryData` ergonomic. The library only fills `mutationFn`/`mutationKey` (+ `meta.invalidates`), so it never overwrites your handlers.

## Plugins

Use `definePlugin` to add cross-cutting behavior. Plugins run in declaration order (first is outermost).

```ts
import { createExecutor, definePlugin, logger } from '@routar/core';

const authPlugin = definePlugin({
  name: 'auth',
  onRequest: async (opts) => ({
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${await getToken()}` },
  }),
  onError: async (err) => {
    if (isUnauthorized(err)) await refreshToken();
    throw err;
  },
});

const executor = createExecutor(transport, {
  plugins: [authPlugin, logger()],
});
```

`retry` and `timeout` are options on `createFetchExecutor` (not plugins):

```ts
import { createFetchExecutor, HttpError } from '@routar/core';

const executor = createFetchExecutor('https://api.example.com', {
  retry: { count: 3, shouldRetry: (err) => !(err instanceof HttpError && err.status < 500) },
  timeout: 8_000,
});
```

## Error Handling

```ts
import { ValidationError, HttpError, TimeoutError } from '@routar/core';

try {
  await todoApi.create({ body: { title: '' } });
} catch (err) {
  if (err instanceof ValidationError) /* request/response schema mismatch */;
  if (err instanceof HttpError)       /* non-2xx: err.status, err.statusText, err.body */;
  if (err instanceof TimeoutError)    /* timed out: err.ms */;
}
```

## Anti-Patterns

- Never put `.transform()` on `response` — use `adapter` instead
- Never duplicate API clients for SSR/CSR — use `dispatchExecutor`
- In MSW, use `z.coerce.number()` for path params, not `z.number()`
- Don't skip `request.path` when `path` contains `:param` segments
- Don't re-pass the router to `createQueries` — it takes only the client (`createQueries(api)`) and recovers the router from it
- Don't hand-write `queryOptions`/`useMutation` boilerplate per domain — derive it with `createQueries`
