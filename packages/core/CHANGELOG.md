# @routar/core

## 1.3.0

### Minor Changes

- Replace middleware system with plugin API. `createExecutor` now accepts `{ plugins }` option with `ExecutorPlugin` objects (`onRequest` / `onResponse` / `onError` hooks). Add `definePlugin` and `logger` helpers. `retry` and `timeout` remain as options on `createFetchExecutor`.

## 1.2.1

### Patch Changes

- 8aa150a: Expand JSDoc `@example` blocks for `endpoint()`, `createApi()`, `createFetchExecutor()`, `withTimeout()`, and `createMswHandlers()` to improve IDE suggestions in Copilot and Cursor.

## 1.2.0

### Minor Changes

- b314358: Move fetch executor into core. `createFetchExecutor` and `HttpError` are now exported directly from `@routar/core` — no separate package needed for native fetch support. The `@routar/fetch` package is deprecated and re-exports from core for backward compatibility.

## 1.1.0

### Minor Changes

- Add TimeoutError class, fix AbortSignal listener leak in withTimeout, improve HttpError with body field, fix RouterDef discriminator, make endpoint params optional when no request schema, strengthen duck-typing for AxiosInstance detection, make ValidationError.cause non-enumerable, add TypeError for object query params, and fix header priority in fetch executor.

## 1.0.0

### Minor Changes

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
