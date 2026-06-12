---
"@routar/core": minor
---

**`endpoint()` `request` is now a single `{ path?, query?, body? }` bucket-map** (interface change).

The two earlier ways of declaring a request — the `request: z.object({ path, query, body })` **envelope** and the top-level `pathParams` / `query` / `body` **separated buckets** (SE-12) — are both removed in favor of one canonical form: `request` as a plain map of standalone validators.

```ts
// before — envelope (removed)
endpoint({
  method: 'GET', path: '/:id',
  request: z.object({ path: z.object({ id: z.number() }), query: z.object({ q: z.string() }) }),
  response: TodoSchema,
})

// before — top-level separated buckets, SE-12 (removed)
endpoint({
  method: 'GET', path: '/:id',
  pathParams: z.object({ id: z.number() }),
  query: z.object({ q: z.string() }),
  response: TodoSchema,
})

// after — request is a { path, query, body } bucket-map
endpoint({
  method: 'GET', path: '/:id',
  request: {
    path: z.object({ id: z.number() }),
    query: z.object({ q: z.string() }),
  },
  response: TodoSchema,
})
```

- Each bucket (`path` / `query` / `body`) is its own validator — any `.parse()` object or Standard Schema. routar composes them into the same envelope internally, so HTTP contract, query keys, react-query flatten, and MSW behavior are unchanged.
- The path-params bucket is keyed `path` (was `pathParams` in SE-12). `request.path` is required when `path` has `:param` segments.
- The removed forms are **compile errors**, not silently dropped: a top-level `pathParams` / `query` / `body` is rejected by a `NoLegacyBuckets` guard, and `request: z.object(...)` no longer matches any overload — so migration surfaces every call site instead of losing request validation at runtime.

**Migration:** unwrap `request: z.object({ … })` → `request: { … }`, and move any top-level `pathParams` / `query` / `body` into `request` (renaming `pathParams` → `path`).
