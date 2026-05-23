# routar
<img width="1200" height="630" alt="routar" src="https://github.com/user-attachments/assets/a2462cf7-d072-48fe-975f-d8e569af9171" />


**Schema-first HTTP API client with end-to-end type safety and runtime validation.**

Define your API once — reuse it across any transport, environment, or HTTP client.

```ts
import { z } from 'zod';
import { endpoint, defineRouter, createApi } from '@routar/core';
import { createFetchExecutor } from '@routar/fetch';

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
- **Composable middleware** — retry, timeout, and logging as stackable functions
- **Nested routers** — mirror your URL structure in the type system
- **Path param enforcement** — `path: '/:id'` with a missing `request.path.id` is a compile error
- **SSR/CSR ready** — same endpoint spec, different executor per environment

---

## Packages

| Package | Description |
|---------|-------------|
| `@routar/core` | Endpoint definitions, router, API client, middleware system |
| `@routar/fetch` | Executor backed by the native `fetch` API |
| `@routar/axios` | Executor backed by Axios |

---

## Installation

```bash
# with fetch
npm install @routar/core @routar/fetch

# with axios
npm install @routar/core @routar/axios axios
```

---

## Quick Start

```ts
import { z } from 'zod';
import { endpoint, defineRouter, createApi } from '@routar/core';
import { createFetchExecutor } from '@routar/fetch';

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

### `createExecutor(transportFn, middlewares?)`

Low-level factory used internally by `@routar/fetch` and `@routar/axios`. Use this to integrate any HTTP client.

```ts
import { createExecutor } from '@routar/core';

const executor = createExecutor(
  async ({ method, url, body, headers, signal }) => {
    const res = await myClient.request({ method, url, body, headers, signal });
    return res.data;
  },
  [withTimeout(5000), withRetry(2)],
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

## Middleware

Middlewares are `(opts, next) => Promise<unknown>` functions applied in declaration order.

```ts
import { createExecutor, withTimeout, withRetry, withLogger, defineMiddleware } from '@routar/core';

const executor = createExecutor(transport, [
  withTimeout(8_000),
  withRetry(3, { shouldRetry: (err) => !(err instanceof HttpError && err.status < 500) }),
  withLogger({ log: (msg, data) => logger.debug(msg, data) }),
]);
```

**Custom middleware:**

```ts
const withCorrelationId = defineMiddleware((opts, next) =>
  next({ ...opts, headers: { ...opts.headers, 'X-Request-Id': crypto.randomUUID() } })
);
```

| Middleware | Signature | Description |
|------------|-----------|-------------|
| `withRetry` | `(count, { shouldRetry? })` | Retries on failure up to `count` times |
| `withTimeout` | `(ms)` | Aborts if no response within `ms` milliseconds |
| `withLogger` | `({ log? })` | Logs each request with method, URL, and duration |

---

## Executors

### `createFetchExecutor(baseURL, options?)`  `@routar/fetch`

Uses the native `fetch` API. Ideal for SSR where per-request dynamic headers are needed.

```ts
import { createFetchExecutor } from '@routar/fetch';

const executor = createFetchExecutor('https://api.example.com', {
  defaultHeaders: async () => {
    const token = await getServerToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  middlewares: [withTimeout(5000)],
});
```

Non-2xx responses throw `HttpError`:

```ts
import { HttpError } from '@routar/fetch';

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

Axios errors propagate as `AxiosError` — all Axios-specific fields (`err.response`, `err.config`) are preserved.

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

// todo.api.ts — one client for both SSR and CSR
export const todoApi = createApi(apiExecutor, todoRouter);
```

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

## Validation Errors

| Error | Package | Thrown when |
|-------|---------|-------------|
| `ValidationError` | `@routar/core` | `request.parse()` or `response.parse()` fails |
| `TimeoutError` | `@routar/core` | Request exceeds `withTimeout` duration |
| `HttpError` | `@routar/fetch` | Server returns a non-2xx status |
| `AxiosError` | axios | Network or HTTP error from the Axios transport |

```ts
import { TimeoutError, ValidationError } from '@routar/core';
import { HttpError } from '@routar/fetch';

try {
  await todoApi.create({ body: { title: '' } });
} catch (err) {
  if (err instanceof ValidationError) console.log(err.message); // cause is non-enumerable
  if (err instanceof HttpError)       console.log(err.status, err.statusText, err.body);
  if (err instanceof TimeoutError)    console.log(`timed out after ${err.ms}ms`);
}
```
