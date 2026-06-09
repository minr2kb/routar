# @routar/ky

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
