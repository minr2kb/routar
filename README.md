# routar
<img width="1200" height="630" alt="image" src="https://github.com/user-attachments/assets/e72a81c4-8c14-4196-b5e3-92c37cef90b5" />



[🇰🇷 한국어](README.ko.md)

[![CI](https://github.com/minr2kb/routar/actions/workflows/ci.yml/badge.svg)](https://github.com/minr2kb/routar/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@routar/core)](https://www.npmjs.com/package/@routar/core)
[![Bundle Size](https://img.shields.io/bundlejs/size/@routar/core)](https://www.npmjs.com/package/@routar/core)
[![Coverage](https://codecov.io/gh/minr2kb/routar/branch/main/graph/badge.svg)](https://codecov.io/gh/minr2kb/routar)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Schema-first HTTP API client with end-to-end type safety and runtime validation.**

Define your API once — reuse it across any transport, environment, or HTTP client.

> Built for frontend teams that manage their own API schema — without waiting for backend coordination or OpenAPI specs.

```ts
import { z } from 'zod';
import { endpoint, defineRouter, createApi } from '@routar/core';
import { createFetchExecutor } from '@routar/core';

const TodoSchema = z.object({ id: z.number(), title: z.string(), completed: z.boolean() });

const todoRouter = defineRouter('/todos', {
  getList:   endpoint({ method: 'GET',  path: '/',    response: z.array(TodoSchema) }),
  getDetail: endpoint({ method: 'GET',  path: '/:id', response: TodoSchema,
                        request: z.object({ path: z.object({ id: z.number() }) }) }),
  create:    endpoint({ method: 'POST', path: '/',    response: TodoSchema,
                        request: z.object({ body: z.object({ title: z.string() }) }) }),
});

const todoApi = createApi(createFetchExecutor('https://api.example.com'), todoRouter);

const todos = await todoApi.getList({});                     // Todo[]
const todo  = await todoApi.getDetail({ path: { id: 1 } }); // Todo
const next  = await todoApi.create({ body: { title: 'buy milk' } }); // Todo
```

---

## Features

- **End-to-end type inference** — request params, response shape, and adapter output, all inferred without `any`
- **Runtime validation** — Zod, Valibot, Yup, or any object with `.parse()` validates both request and response
- **Transport agnostic** — swap `fetch`, axios, or your own HTTP client by changing one line
- **Plugin system** — composable named plugins with request/response/error hooks; `retry` and `timeout` as first-class options
- **Nested routers** — mirror your URL structure in the type system
- **Path param enforcement** — `path: '/:id'` with a missing `request.path.id` is a compile error
- **SSR/CSR ready** — same endpoint spec, different executor per environment

---

## Packages

| Package | Description |
|---------|-------------|
| `@routar/core` | Endpoint definitions, router, API client, plugin system, native `fetch` executor |
| `@routar/axios` | Executor backed by Axios |
| `@routar/ky` | Executor backed by [ky](https://github.com/sindresorhus/ky) |
| `@routar/react-query` | TanStack Query bindings — typed `queryOptions` / `mutationOptions` factories from your router |

---

## TanStack Query Integration

`@routar/react-query` derives typed `queryOptions` and `mutationOptions` factories directly from your routar router. No new hook API — use TanStack's own hooks as-is.

```bash
npm install @routar/react-query @tanstack/react-query
```

```ts
// remote/services/todo.ts
import { createApi, defineRouter } from '@routar/core'
import { createQueries } from '@routar/react-query'

export const TodoRouter = defineRouter('/todos', { /* ... */ })
export const todoApi = createApi(executor, TodoRouter)
export const todoQuery = createQueries(todoApi)
```

```tsx
// Query — useSuspenseQuery, prefetchQuery, etc.
const { data } = useSuspenseQuery(todoQuery.getList())

// Mutation — with declarative invalidation
const { mutate } = useMutation(
  todoQuery.create({ invalidates: [todoQuery.getList.queryKey()] })
)
```

Wire `routarMutationCache` once when creating your `QueryClient` to enable declarative `invalidates`:

```ts
import { routarMutationCache } from '@routar/react-query'

let queryClient: QueryClient
queryClient = new QueryClient({ mutationCache: routarMutationCache(() => queryClient) })
```

---

## AI Integration

routar ships with resources for AI coding assistants:

| Resource | Location | Purpose |
|----------|----------|---------|
| `llms.txt` | [`/llms.txt`](https://routar.vercel.app/llms.txt) | Concise API index for LLM tools (Context7, etc.) |
| `llms-full.txt` | [`/llms-full.txt`](https://routar.vercel.app/llms-full.txt) | Full API reference with examples |
| `AGENTS.md` | [AGENTS.md](./AGENTS.md) | Guide for AI agents in routar-consumer projects |

JSDoc `@example` blocks are included in every published `.d.ts` file, so Copilot and Cursor give routar-specific suggestions out of the box.

---

## When NOT to use routar

routar is the right fit when your **frontend team owns and manages the API schema** — no backend coordination needed.

Consider alternatives when:

| Situation | Better fit |
|-----------|-----------|
| You already have an OpenAPI / Swagger spec | [orval](https://orval.dev/) or [hey-api](https://heyapi.dev/) — generate the client from the spec |
| You need a shared contract between backend and frontend | [ts-rest](https://ts-rest.com/) or [oRPC](https://orpc.unnoq.com/) — both sides share the same schema |
| Full-stack type safety with RPC-style APIs | [tRPC](https://trpc.io/) |

---

## Installation

```bash
# with fetch (built into core)
npm install @routar/core

# with axios
npm install @routar/core @routar/axios axios

# with ky
npm install @routar/core @routar/ky ky
```

---

## Quick Start

```ts
import { z } from 'zod';
import { endpoint, defineRouter, createApi } from '@routar/core';
import type { ApiTypes } from '@routar/core';
import { createFetchExecutor } from '@routar/core';

const TodoSchema = z.object({ id: z.number(), title: z.string(), completed: z.boolean() });

const todoRouter = defineRouter('/todos', {
  getList: endpoint({
    method: 'GET',
    path: '/',
    response: z.array(TodoSchema),
  }),
  getDetail: endpoint({
    method: 'GET',
    path: '/:id',
    request: z.object({ path: z.object({ id: z.number() }) }),
    response: TodoSchema,
  }),
  create: endpoint({
    method: 'POST',
    path: '/',
    request: z.object({ body: z.object({ title: z.string() }) }),
    response: TodoSchema,
  }),
});

const executor = createFetchExecutor('https://api.example.com');
const todoApi  = createApi(executor, todoRouter);

// Extract types from the client — no duplication
type TodoApiTypes   = ApiTypes<typeof todoApi>;
type Todo           = TodoApiTypes['getDetail']['response']; // { id: number; title: string; completed: boolean }
type CreateRequest  = TodoApiTypes['create']['request'];     // { body: { title: string } }
```

---

## Core API

### `endpoint(spec)`

Defines a single endpoint. Use it to get full type inference on `adapter` without casts.

```ts
// with adapter — raw is inferred from the response schema
endpoint({
  method: 'GET',
  path: '/',
  response: z.array(TodoRawSchema),
  adapter: (raw) => raw.map(toTodoItem), // raw: z.infer<typeof TodoRawSchema>[]
});
```

**Path param enforcement** — mismatched path params are a compile error:

```ts
// ✅
endpoint({ path: '/:id', request: z.object({ path: z.object({ id: z.number() }) }), ... })

// ❌ compile error — ':id' is declared but request.path.id is missing
endpoint({ path: '/:id', request: z.object({ query: z.object({ q: z.string() }) }), ... })
```

---

### `defineRouter(prefix, endpoints)`

Groups endpoints under a shared URL prefix. Supports arbitrary nesting.

```ts
const apiRouter = defineRouter('/api', {
  users: defineRouter('/users', {
    getList:   endpoint({ method: 'GET', path: '/',    response: UserListSchema }),
    getDetail: endpoint({ method: 'GET', path: '/:id', response: UserSchema }),

    todos: defineRouter('/todos', {
      getList: endpoint({ method: 'GET', path: '/', response: TodoListSchema }),
    }),
  }),
});

const api = createApi(executor, apiRouter);

await api.users.getList({});                         // GET /api/users
await api.users.getDetail({ path: { id: 1 } });      // GET /api/users/1
await api.users.todos.getList({});                   // GET /api/users/todos
```

---

### `createApi(executor, router)`

Produces a fully-typed API client. Each endpoint becomes an async function: `(params, signal?) => Promise<Response>`.

```ts
// three equivalent forms
const api = createApi(executor, todoRouter);
const api = createApi(executor, '/todos', { getList: endpoint({ ... }) });
const api = createApi(executor, { getList: endpoint({ ... }) });
```

Request params follow `{ path?, query?, body? }`:

```ts
await api.update({
  path:  { id: 1 },
  body:  { completed: true },
  query: { version: 2 },
});
```

---

### `createExecutor(transport, options?)`

Low-level factory used internally by `@routar/axios` and `@routar/ky`. Use this to integrate any HTTP client.

```ts
import { createExecutor } from '@routar/core';

const executor = createExecutor(
  async ({ method, url, body, headers, signal }) => {
    const res = await myClient.request({ method, url, body, headers, signal });
    return res.data;
  },
  { plugins: [authPlugin] },
);
```

---

### `dispatchExecutor(resolver)`

Creates an executor that selects the underlying transport at request time. Use this to unify SSR and CSR behind a single API client — no duplicate `*ServerApi` instances needed.

The `resolver` receives the full request options, so it can branch on environment, URL prefix, auth context, or any runtime condition.

```ts
import { dispatchExecutor } from '@routar/core';

// Pick transport based on environment (SSR vs CSR)
const executor = dispatchExecutor(() =>
  typeof window === 'undefined' ? serverExecutor : clientExecutor,
);

// Or route by request path
const executor = dispatchExecutor((opts) =>
  opts.url.startsWith('/internal') ? internalExecutor : publicExecutor,
);
```

---

## Plugins

Plugins are named objects with optional lifecycle hooks — `onRequest`, `onResponse`, `onError`. Pass them via `plugins` in `createExecutor`. `retry` and `timeout` are first-class options.

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
  plugins: [authPlugin, logger({ log: (msg, data) => logger.debug(msg, data) })],
});
```

**Custom plugin:**

```ts
const correlationPlugin = definePlugin({
  onRequest: (opts) => ({
    ...opts,
    headers: { ...opts.headers, 'X-Request-Id': crypto.randomUUID() },
  }),
});
```

| | Description |
|--|-------------|
| `plugins` | Array of `ExecutorPlugin` objects, applied in declaration order (first is outermost) |
| `logger` | Built-in plugin: logs method, URL, and duration |

`retry` and `timeout` are available on `createFetchExecutor` — for axios and ky, configure them on the underlying instance instead.

---

## Executors

### `createFetchExecutor(baseURL, options?)`  `@routar/core`

Uses the native `fetch` API. Ideal for SSR where per-request dynamic headers are needed.

`baseURL` accepts a static string or a sync/async factory called on every request — useful when the origin depends on the runtime environment (e.g. an absolute URL on the server vs a relative path on the client):

```ts
const executor = createFetchExecutor(
  () => (typeof window === 'undefined' ? 'http://localhost:3000/api' : '/api'),
);
```

```ts
import { createFetchExecutor } from '@routar/core';

const executor = createFetchExecutor('https://api.example.com', {
  defaultHeaders: async () => {
    const token = await getServerToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  retry: 2,
  timeout: 5000,
});
```

Non-2xx responses throw `HttpError`:

```ts
import { HttpError } from '@routar/core';

if (err instanceof HttpError) console.log(err.status, err.statusText, err.body);
```

---

### `createAxiosExecutor(instanceOrFactory, options?)`  `@routar/axios`

Accepts an `AxiosInstance` (CSR) or a factory function (SSR).

```ts
import { createAxiosExecutor } from '@routar/axios';

// CSR — shared instance
const executor = createAxiosExecutor(axios.create({ baseURL: 'https://api.example.com' }));

// SSR — factory, fresh instance per request
const executor = createAxiosExecutor(async () => {
  const token = await getServerToken();
  return axios.create({ baseURL: 'https://api.example.com', headers: { Authorization: `Bearer ${token}` } });
});
```

HTTP failures are normalized to `HttpError` (same as the fetch executor); the original `AxiosError` is preserved on `err.cause`, so Axios-specific fields (`err.cause.config`, `err.cause.code`) remain available.

---

## SSR / CSR Pattern

Use `dispatchExecutor` to select the right transport at request time — one API client works in both environments without duplicate `*ServerApi` instances.

```ts
import { dispatchExecutor } from '@routar/core';

// executor.ts
const clientExecutor = createAxiosExecutor(axios.create({ baseURL: BASE_URL }));
const serverExecutor = createFetchExecutor(BASE_URL, {
  defaultHeaders: async () => {
    const { cookies } = await import('next/headers');
    const token = (await cookies()).get('access_token')?.value;
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export const apiExecutor = dispatchExecutor(() =>
  typeof window === 'undefined' ? serverExecutor : clientExecutor,
);

// remote/services/todo.ts — one client for both SSR and CSR
export const todoApi = createApi(apiExecutor, todoRouter);
```

> **Next.js App Router note:** `typeof window === 'undefined'` always returns `true` inside Server Components — they always run on the server. If you use App Router Server Components, pass the correct executor directly rather than relying on this check.

For routes with no environment-specific auth (e.g. your own API with an absolute base URL), a single fetch executor works without `dispatchExecutor`:

```ts
export const localExecutor = createFetchExecutor('http://localhost:3000/api');
export const todoApi = createApi(localExecutor, todoRouter);
```

---

## Type Utilities

### `ApiTypes<TApi>`

Extracts request and response types from an API client.

```ts
import type { ApiTypes } from '@routar/core';

type TodoApiTypes = ApiTypes<typeof todoApi>;
type CreateRequest  = TodoApiTypes['create']['request'];  // { body: { title: string } }
type CreateResponse = TodoApiTypes['create']['response']; // Todo
```

### `PathParams<TPath>`

Extracts `:param` names from a path string as a union.

```ts
type P = PathParams<'/:userId/posts/:postId'>; // 'userId' | 'postId'
```

---

## Vanilla Usage

routar works without any framework — endpoints are plain async functions:

```ts
const todoApi = createApi(createFetchExecutor('https://api.example.com'), todoRouter);

// call directly
const todos = await todoApi.getList({});
renderTodoList(todos); // todos is typed as Todo[]

// cancel in-flight requests with AbortSignal
const controller = new AbortController();
const todo = await todoApi.getDetail({ path: { id: 1 } }, controller.signal);
controller.abort();
```

---

## Validation Errors

| Error | Package | Thrown when |
|-------|---------|-------------|
| `ValidationError` | `@routar/core` | `request.parse()` or `response.parse()` fails |
| `TimeoutError` | `@routar/core` | Request exceeds the `timeout` option duration |
| `HttpError` | `@routar/core` | Any executor (fetch, Axios, ky) returns a non-2xx status — the original transport error is on `err.cause` |

```ts
import { TimeoutError, ValidationError } from '@routar/core';
import { HttpError } from '@routar/core';

try {
  await todoApi.create({ body: { title: '' } });
} catch (err) {
  if (err instanceof ValidationError) console.log(err.message); // cause is non-enumerable
  if (err instanceof HttpError)       console.log(err.status, err.statusText, err.body);
  if (err instanceof TimeoutError)    console.log(`timed out after ${err.ms}ms`);
}
```
