---
"@routar/ky": minor
---

Add `@routar/ky` — ky-based executor for routar.

`createKyExecutor` accepts a `KyInstance` (CSR) or a factory function that returns one (SSR), following the same `InstanceOrFactory` pattern as `@routar/axios`. Instance discrimination uses `'extend' in input` duck-typing. ky's native `HTTPError` propagates unchanged.
