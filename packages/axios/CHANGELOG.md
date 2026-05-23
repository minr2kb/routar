# @routar/axios

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
