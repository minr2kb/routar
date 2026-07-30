---
"@routar/react-query": patch
---

Fix `.infinite()`'s type not respecting `createQueries({ flatten: true })`. `QueryAccessor`'s `infinite` field was typed as `InfiniteAccessor<TParams, TData>`, always requiring the envelope request shape (`{ path, query, body }`) regardless of `flatten`. The runtime, however, already normalized `.infinite()`'s params through the same flatten logic as the plain accessor — so under `flatten: true`, TypeScript demanded envelope-shaped params while the runtime treated whatever was passed as flat, silently dropping fields nested under `path`/`query`/`body` (e.g. a path param) when a caller followed the type and passed the envelope.

`InfiniteAccessor` now takes a `TFlatten` parameter and applies the same `ApplyFlatten` as the plain accessor, so `.infinite()` accepts flat params under `flatten: true`, matching what the runtime always did. `.queryKey()` / `.infinite.queryKey()` are unaffected — they stay envelope-only by design, independent of `flatten`.
