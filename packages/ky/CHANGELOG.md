# @routar/ky

## 1.8.0

## 1.7.0

## 1.6.0

### Minor Changes

- b0925cb: Executor improvements: error normalization, baseURL factory, and unwrap option

  - **HttpError normalization (SE-4)**: All executors now normalize transport errors to `HttpError` before calling `onError` plugins. `AxiosError` and ky `HTTPError` are caught inside each executor and re-thrown as `HttpError` with `status`, `statusText`, and `body` populated. The original error is preserved on `cause`. Plugins and callers can now use a single `instanceof HttpError` check regardless of transport.

  - **HttpError enrichment**: `HttpError` now includes `url` (full request URL) and `method` (HTTP method) fields for easier debugging and logging.

  - **`createFetchExecutor` baseURL factory (SE-5)**: `baseURL` now accepts a sync or async factory `() => string | Promise<string>` in addition to a plain string. The factory is called per-request, enabling dynamic base URLs (e.g. SSR vs CSR environment detection).

  - **`unwrap` option (SE-6)**: `CreateExecutorOptions` (and thus all executors) now accept an `unwrap: (raw: unknown) => unknown` option. It runs on the raw response before schema validation — a first-class alternative to writing a `definePlugin({ onResponse })` for envelope unwrapping.

## 1.5.0

## 1.4.2

## 1.4.1

## 1.4.0

## 1.3.0

### Minor Changes

- Updated dependency `@routar/core` to `1.3.0`. Plugin system replaces middleware — use `plugins` option instead of `middlewares`.

## 1.2.1

### Patch Changes

- d38492d: Sync version with @routar/core 1.2.1

## 1.2.0

### Minor Changes

- b314358: Move fetch executor into core. `createFetchExecutor` and `HttpError` are now exported directly from `@routar/core` — no separate package needed for native fetch support. The `@routar/fetch` package is deprecated and re-exports from core for backward compatibility.

## 1.1.0

### Minor Changes

- Initial release of `@routar/ky` — ky-based executor for routar.
