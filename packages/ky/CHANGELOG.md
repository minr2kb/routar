# @routar/ky

## 1.2.0

### Minor Changes

- 998bfcf: Add `@routar/ky` — ky-based executor for routar.

  `createKyExecutor` accepts a `KyInstance` (CSR) or a factory function that returns one (SSR), following the same `InstanceOrFactory` pattern as `@routar/axios`. Instance discrimination uses `'extend' in input` duck-typing. ky's native `HTTPError` propagates unchanged.

## 1.1.0

### Minor Changes

- Initial release of `@routar/ky` — ky-based executor for routar.
