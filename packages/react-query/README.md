# @routar/react-query

TanStack Query integration for [routar](https://github.com/minr2kb/routar) — derives typed `queryOptions` and `mutationOptions` factories directly from your routar router. No new hook API; use TanStack's own hooks as-is.

## Install

```bash
bun add @routar/react-query @tanstack/react-query
# peer deps: @routar/core @tanstack/react-query@^5
```

```bash
npm install @routar/react-query @tanstack/react-query
```

## Quick start

```ts
// todo.ts
import { createQueries } from "@routar/react-query";
import { todoApi } from "./todo"; // routar createApi client (createQueries lives here too)

export const todoQuery = createQueries(todoApi);
```

```tsx
// TodoList.tsx
import { useSuspenseQuery } from "@tanstack/react-query";
import { todoQuery } from "./todo";

export function TodoList() {
  const { data } = useSuspenseQuery(todoQuery.getList());
  return <ul>{data.map((t) => <li key={t.id}>{t.title}</li>)}</ul>;
}
```

```tsx
// CreateTodo.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { todoQuery } from "./todo";

export function CreateTodo() {
  const qc = useQueryClient();
  const { mutate } = useMutation(
    todoQuery.create({
      invalidates: [todoQuery.getList.queryKey()],
    }),
  );
  return (
    <button onClick={() => mutate({ body: { title: "New todo" } })}>
      Add
    </button>
  );
}
```

## Per-endpoint defaults

Pass a `defaults` map to `createQueries` to set default options for specific endpoints. Each key is an endpoint name; the value is merged into every accessor call **before** per-call options (so a per-call option always wins).

```ts
export const todoQuery = createQueries(todoApi, {
  defaults: {
    getDetail: { staleTime: 5 * 60_000 }, // GET → query option defaults
    getList:   { staleTime: 60_000 },
  },
});
```

- Top-level endpoints only — defaults for endpoints inside nested routers are not matched.
- For mutation endpoints, the value is mutation options (minus `invalidates`); `mutationFn` and `mutationKey` are still set by the library.

## Error typing

`error` in query/mutation results is typed as TanStack's `DefaultError`. To narrow it to `HttpError` globally, augment TanStack's `Register` interface once in your project — no change to `createQueries` is needed, accessors pick it up automatically:

```ts
import type { HttpError } from '@routar/core';
declare module '@tanstack/react-query' {
  interface Register { defaultError: HttpError }
}
```

## Queries

`createQueries` mirrors the shape of your routar API client. Every GET endpoint becomes a **query accessor** — a function that returns a TanStack `queryOptions` object.

```ts
// params: the routar request ({ path?, query?, body? })
// options: any useQuery option except queryKey / queryFn
todoQuery.getList(params?, options?)       // → queryOptions(...)
todoQuery.getDetail({ path: { id } })     // required when endpoint has required fields
todoQuery.getList({ query: { done: true } }, { staleTime: 60_000 })
```

Pass the result directly to any TanStack hook or helper:

```ts
// client component
const { data } = useSuspenseQuery(todoQuery.getList());

// multiple queries at once
const [todos, user] = useSuspenseQueries({
  queries: [todoQuery.getList(), userQuery.getMe()],
});
```

### Key helper

Each query accessor exposes a `.queryKey()` helper that returns the same branded key used internally — useful for `getQueryData`, `setQueryData`, and `invalidateQueries`:

```ts
const key = todoQuery.getDetail.queryKey({ path: { id: "1" } });
// key is branded → qc.getQueryData(key) infers the correct type

qc.invalidateQueries({ queryKey: todoQuery.getList.queryKey() });
```

### SSR prefetch

```ts
// app/(pages)/todos/page.tsx  (Next.js server component)
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/utils/get-query-client";
import { todoQuery } from "@/remote/services/todo";

export default async function TodosPage() {
  const qc = getQueryClient();
  await qc.prefetchQuery(todoQuery.getList());

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <Suspense>
        <TodoList />
      </Suspense>
    </HydrationBoundary>
  );
}
```

## Mutations

Every non-GET endpoint becomes a **mutation accessor** — a function that returns a TanStack `mutationOptions` object with `mutationKey` and `mutationFn` pre-filled.

```ts
// options: any useMutation option except mutationFn / mutationKey, plus invalidates
todoQuery.create(options?)
todoQuery.update(options?)
todoQuery.remove(options?)
```

The variables passed to `.mutate()` are the routar request object:

```ts
const { mutate } = useMutation(todoQuery.create());
mutate({ body: { title: "New todo" } });

const { mutate: update } = useMutation(todoQuery.update());
update({ path: { id: "1" }, body: { title: "Updated" } });
```

### Mutation key helper

```ts
todoQuery.create.mutationKey  // → ["todos", "create"]
```

## Invalidation

By default mutations do **not** invalidate anything — you stay in full control.

### Declarative invalidation with `invalidates`

Pass `invalidates` to declare which query keys to invalidate on success:

```ts
useMutation(
  todoQuery.create({
    invalidates: [
      todoQuery.getList.queryKey(),   // prefer narrow: just the key(s) actually affected
      // todoQuery.$key               // whole-domain: refetches ALL active lists + details — use only when truly needed
    ],
  }),
);
```

Prefer narrow invalidation — target the specific key(s) affected by the mutation (e.g. `todoQuery.getList.queryKey()`). Reserve `todoQuery.$key` for mutations that truly invalidate every query in the domain, since it triggers a refetch of all active lists and details.

`invalidates` is stored in `mutation.meta` and processed by `routarMutationCache`. **Wire it once** when creating your `QueryClient` — without this wiring, `invalidates` does nothing. In development, the library logs a one-time `console.warn` if a mutation declares `invalidates` while no `routarMutationCache` is wired.

```ts
// utils/get-query-client.ts  (or wherever you create QueryClient)
import { QueryClient } from "@tanstack/react-query";
import { routarMutationCache } from "@routar/react-query";

let queryClient: QueryClient;
queryClient = new QueryClient({
  mutationCache: routarMutationCache(() => queryClient),
});
```

Without this wiring, `invalidates` is silently ignored — use a native `onSuccess` callback instead.

### Manual invalidation

```ts
useMutation(
  todoQuery.create({
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: todoQuery.getList.queryKey() }),
  }),
);
```

## Optimistic updates

The library does not intercept optimistic update logic — pass native TanStack handlers and they are merged in:

> **Adapter caveat:** if the endpoint has an `adapter`, the value stored in the query cache is the **adapted** output (e.g. `{ ...todo, label }`), not the raw response. `setQueryData` callbacks must produce that adapted shape — include any derived fields that the adapter adds.

```ts
const qc = useQueryClient();

useMutation(
  todoQuery.update({
    onMutate: async (vars) => {
      const key = todoQuery.getDetail.queryKey({ path: { id: vars.path.id } });
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      // If the endpoint has an adapter, old already has the adapted shape — preserve derived fields
      qc.setQueryData(key, (old: any) => ({ ...old, ...vars.body }));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(ctx!.key, ctx!.prev),
    onSettled: (_d, _e, vars) =>
      qc.invalidateQueries({
        queryKey: todoQuery.getDetail.queryKey({ path: { id: vars.path.id } }),
      }),
  }),
);
```

## Key structure

Query keys follow the shape `[...rootSegments, endpointName, params?]`:

| Accessor | Key (no params) | Key (with params) |
|---|---|---|
| `todoQuery.getList()` | `["todos", "getList"]` | `["todos", "getList", { query: { done: true } }]` |
| `todoQuery.getDetail({ path: { id: "1" } })` | — | `["todos", "getDetail", { path: { id: "1" } }]` |

### Domain key (`$key`)

Every accessor object exposes `$key` — the root segments shared by all keys in that domain:

```ts
todoQuery.$key  // → ["todos"]

// Invalidate everything in the domain:
qc.invalidateQueries({ queryKey: todoQuery.$key });
```

### Nested routers

Nested `defineRouter` calls accumulate segments:

```ts
// router prefix "/api/v1/users"
userQuery.$key              // → ["api", "v1", "users"]
userQuery.posts.$key        // → ["api", "v1", "users", "posts"]
userQuery.posts.getList.queryKey()  // → ["api", "v1", "users", "posts", "getList"]
```

### Custom root key

Override the root segments at creation time:

```ts
const todoQuery = createQueries(todoApi, { key: "todo" });
todoQuery.$key  // → ["todo"]
```

## License

MIT
