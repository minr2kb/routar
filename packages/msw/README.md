# @routar/msw

MSW v2 handler factory for [routar](https://github.com/minr2kb/routar) — generate fully-typed mock handlers from a `RouterDef`.

## Install

```bash
npm install @routar/core msw
npm install --save-dev @routar/msw
```

## Usage

```ts
import { createMswHandlers } from '@routar/msw'
import { HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { todoRouter } from './api'

const server = setupServer(
  ...createMswHandlers(todoRouter, 'https://api.example.com', {
    getList: () => HttpResponse.json([{ id: 1, title: 'Todo' }]),
    getDetail: ({ params }) =>
      HttpResponse.json({ id: params.id, title: 'Todo' }),
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

- **Partial mocking** — only endpoints with a resolver get a handler; the rest pass through naturally.
- **Typed resolver context** — `params`, `query`, and `body` are parsed through the endpoint's `request` schema, giving you the exact types defined in your router.
- **Nested routers** — the resolver map mirrors the router's shape, including nested `defineRouter` entries.

See the [documentation](https://routar.vercel.app) or the [main README](https://github.com/minr2kb/routar) for full documentation.
