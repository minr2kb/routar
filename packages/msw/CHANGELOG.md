# @routar/msw

## 1.3.0

### Minor Changes

- Updated dependency `@routar/core` to `1.3.0`.

## 1.2.1

### Patch Changes

- 8aa150a: Expand JSDoc `@example` blocks for `endpoint()`, `createApi()`, `createFetchExecutor()`, `withTimeout()`, and `createMswHandlers()` to improve IDE suggestions in Copilot and Cursor.
- Updated dependencies [8aa150a]
  - @routar/core@1.2.1

## 1.2.0

### Minor Changes

- b314358: Move fetch executor into core. `createFetchExecutor` and `HttpError` are now exported directly from `@routar/core` — no separate package needed for native fetch support. The `@routar/fetch` package is deprecated and re-exports from core for backward compatibility.

### Patch Changes

- Updated dependencies [b314358]
  - @routar/core@1.2.0
