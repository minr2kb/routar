---
"@routar/react-query": patch
---

Fix `defaults.invalidates` silently ignored in mutation accessors, and add options factory form to `createQueries`.

- **Fix**: `defaults.create.invalidates` was spread as a top-level key instead of being routed to `meta.invalidates` where `routarMutationCache` reads it — now handled correctly.
- **Fix**: `defaults.create.meta` was overwritten by call-site `meta` instead of merging — now deep-merged (default < call-site).
- **Fix**: `invalidates` is now allowed in `EndpointDefaults` at the type level (the `Omit` was removed).
- **Feature**: `createQueries(api, options)` now accepts a factory `(q) => options` as its second argument, making it possible to reference sibling key helpers (e.g. `q.getList.queryKey()`) inside `defaults.invalidates` without circular-variable issues.
