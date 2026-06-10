# @routar/axios

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

- Add TimeoutError class, fix AbortSignal listener leak in withTimeout, improve HttpError with body field, fix RouterDef discriminator, make endpoint params optional when no request schema, strengthen duck-typing for AxiosInstance detection, make ValidationError.cause non-enumerable, add TypeError for object query params, and fix header priority in fetch executor.

## 1.0.0

### Patch Changes

- 8aa9bde: Add `dispatchExecutor`, `validate` option for `createApi`, and nested `ApiTypes` support

  **`dispatchExecutor(resolver)`** — selects the underlying executor at request time based on any runtime condition (environment, URL prefix, auth context, etc.). Replaces the pattern of maintaining separate `*ServerApi` and `*ClientApi` instances.

  ```ts
  export const apiExecutor = dispatchExecutor(() =>
    typeof window === "undefined" ? serverExecutor : clientExecutor
  );
  export const todoApi = createApi(apiExecutor, todoRouter);
  ```

  **`validate` option on `createApi`** — controls whether request and response schemas are run on each call. Useful for skipping validation overhead in production while keeping it during development.

  ```ts
  // skip all validation
  createApi(executor, router, { validate: false });

  // keep request validation, skip response in prod
  createApi(executor, router, {
    validate: {
      request: true,
      response: process.env.NODE_ENV !== "production",
    },
  });
  ```

  **`ApiTypes` nested router support** — `ApiTypes<typeof api>` now recursively resolves nested router client types.

  ```ts
  type NestedTypes = ApiTypes<typeof api>;
  type Req = NestedTypes["users"]["todos"]["getList"]["request"];
  ```

- Updated dependencies [8aa9bde]
  - @routar/core@1.0.0

## 0.1.1

### Patch Changes

- 03d7d93: Fix URL construction when baseURL contains a path prefix.

  `new URL(url, base)` drops the base path when `url` starts with `/` — e.g.
  `new URL('/todos', 'http://host/api')` resolves to `http://host/todos`, not
  `http://host/api/todos`. Both executors now use string concatenation
  (`base + url`) so a baseURL like `http://host/api` correctly produces
  `http://host/api/todos`.
