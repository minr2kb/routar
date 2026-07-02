---
"@routar/core": minor
---

Add `createParser` for framework-agnostic server-side request/response validation.

`createParser(spec)` takes an `endpoint()` spec and returns `{ parseRequest?, parseResponse }` validate-or-throw helpers for use in any server framework (Next.js Route Handlers, Hono, Express…). It reuses the same `runValidator` semantics as `createApi`: valid input resolves to the parsed value, invalid input throws the original error (`ZodError` or `StandardSchemaError`) unchanged. No HTTP status-code mapping or error formatting is baked in — that stays the calling app's responsibility. `parseRequest` is present only when the spec declares a `request` validator; `parseResponse` validates against the pure `response` schema and does not apply the `adapter`.
