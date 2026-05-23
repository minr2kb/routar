# @routar/core

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
