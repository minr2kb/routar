---
"@routar/core": minor
"@routar/axios": minor
"@routar/ky": minor
---

Executor improvements: error normalization, baseURL factory, and unwrap option

- **HttpError normalization (SE-4)**: All executors now normalize transport errors to `HttpError` before calling `onError` plugins. `AxiosError` and ky `HTTPError` are caught inside each executor and re-thrown as `HttpError` with `status`, `statusText`, and `body` populated. The original error is preserved on `cause`. Plugins and callers can now use a single `instanceof HttpError` check regardless of transport.

- **HttpError enrichment**: `HttpError` now includes `url` (full request URL) and `method` (HTTP method) fields for easier debugging and logging.

- **`createFetchExecutor` baseURL factory (SE-5)**: `baseURL` now accepts a sync or async factory `() => string | Promise<string>` in addition to a plain string. The factory is called per-request, enabling dynamic base URLs (e.g. SSR vs CSR environment detection).

- **`unwrap` option (SE-6)**: `CreateExecutorOptions` (and thus all executors) now accept an `unwrap: (raw: unknown) => unknown` option. It runs on the raw response before schema validation — a first-class alternative to writing a `definePlugin({ onResponse })` for envelope unwrapping.
