---
"@routar/react-query": minor
---

`createQueries`: dynamic per-endpoint defaults, opt-in flat params, and `defaults.invalidates` fixes.

- **Feature**: per-endpoint `defaults` values may now be **functions** `(params, q) => options`, evaluated lazily against the fully-built `q`. Use the function form to reference sibling key helpers (e.g. `(_, q) => ({ invalidates: [q.getList.queryKey()] })`) without circular-variable issues — `params` is the call params for queries, or `undefined` for mutations. Priority is unchanged: static/dynamic default < per-call options.
- **Feature**: new `flatten?: boolean` option. With `flatten: true`, accessors accept *flat* params — the union of the request's `path`/`query`/`body` fields (`getDetail({ id })`) instead of the nested envelope (`getDetail({ path: { id } })`). Endpoints whose buckets collide on a key, or whose `body` isn't a plain object, transparently fall back to the envelope. The query key is always built from the envelope, so flat and envelope call styles converge (SSR/CSR keys match).
- **Removed (unreleased)**: the `createQueries(api, (q) => options)` factory form. It was never published; the new dynamic `defaults` function form is a superset replacement (it also exposes `params`).
- **Fix**: `defaults.create.invalidates` was spread as a top-level key instead of being routed to `meta.invalidates` where `routarMutationCache` reads it — now handled correctly.
- **Fix**: `defaults.create.meta` was overwritten by call-site `meta` instead of merging — now deep-merged (default < call-site).
- **Fix**: `invalidates` is now allowed in `EndpointDefaults` at the type level (the `Omit` was removed).
