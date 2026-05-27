---
"@routar/core": minor
"@routar/fetch": minor
"@routar/axios": minor
"@routar/ky": minor
"@routar/msw": minor
---

Move fetch executor into core. `createFetchExecutor` and `HttpError` are now exported directly from `@routar/core` — no separate package needed for native fetch support. The `@routar/fetch` package is deprecated and re-exports from core for backward compatibility.
