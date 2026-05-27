# @routar/msw

## 2.0.0

### Minor Changes

- b314358: Move fetch executor into core. `createFetchExecutor` and `HttpError` are now exported directly from `@routar/core` — no separate package needed for native fetch support. The `@routar/fetch` package is deprecated and re-exports from core for backward compatibility.

### Patch Changes

- Updated dependencies [b314358]
  - @routar/core@2.0.0
