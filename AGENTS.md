# AGENTS.md — routar

Guidelines for AI agents (Claude Code, Copilot, Cursor, etc.) working in projects that use routar.

## What is routar?

routar is a schema-first HTTP API client library. You define endpoints once with Zod schemas and get a fully-typed, runtime-validated API client — no codegen, no OpenAPI spec required.

Packages:
- `@routar/core` — endpoint, router, createApi, middleware, fetch executor
- `@routar/axios` — Axios executor
- `@routar/ky` — ky executor
- `@routar/msw` — MSW v2 mock handler factory (for testing)

## Installation

```bash
# fetch (zero extra dependencies)
npm install @routar/core

# with Axios
npm install @routar/core @routar/axios axios

# for testing
npm install @routar/core msw
npm install --save-dev @routar/msw
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

## Middleware

```ts
import { withTimeout, withRetry, withLogger } from '@routar/core';
import { HttpError } from '@routar/core';

const executor = createFetchExecutor('https://api.example.com', {
  middlewares: [
    withTimeout(8_000),
    withRetry(3, {
      shouldRetry: (err) => !(err instanceof HttpError && err.status < 500),
    }),
    withLogger(),
  ],
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
