---
"@routar/react-query": minor
---

`flatten: true` now applies consistently across every accessor surface, not just the main call.

**`.infinite()`'s type didn't respect `flatten`.** `QueryAccessor`'s `infinite` field was typed as `InfiniteAccessor<TParams, TData>`, always requiring the envelope request shape (`{ path, query, body }`) regardless of `flatten`. The runtime, however, already normalized `.infinite()`'s params through the same flatten logic as the plain accessor — so under `flatten: true`, TypeScript demanded envelope-shaped params while the runtime treated whatever was passed as flat, silently dropping fields nested under `path`/`query`/`body` (e.g. a path param) when a caller followed the type. `InfiniteAccessor` now takes a `TFlatten` parameter and applies the same `ApplyFlatten` as the plain accessor.

**`.queryKey()` / `.infinite.queryKey()` now also accept flat params under `flatten: true`**, matching the accessor call shape, instead of always requiring the envelope. Internally they still normalize to the envelope before building the key, so the resulting key is identical either way — this only changes what shape you pass *in*. If you were previously calling these helpers directly (e.g. for `invalidates`) with the envelope shape under `flatten: true`, switch to flat params to match the new type.

```ts
const todoQuery = createQueries(todoApi, { flatten: true })
todoQuery.getDetail.queryKey({ id: '1' })          // was: { path: { id: '1' } }
todoQuery.getList.infinite.queryKey({ done: true }) // was: { query: { done: true } }
```
