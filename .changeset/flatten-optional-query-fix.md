---
"@routar/react-query": patch
---

Fix `flatten: true` losing query parameters when the query bucket schema uses `.optional()`.

Two bugs were fixed:

- **Type-level**: `Flatten<R>`, `HasOverlap`, and `BodyFlattenable` used `R extends { query: infer Q }` conditional patterns, which only match *required* properties. An optional query bucket (`{ query?: T }` produced by `z.object({…}).optional()`) never matched, so the flat accessor type collapsed to `{}` — TypeScript accepted calls without `userId` even when it was required.

- **Runtime**: `getShape` in the flatten utility did not unwrap `ZodOptional` wrappers, so `collectKeys` returned `[]` for any `.optional()` query schema. `toEnvelope` then omitted the query field entirely from the assembled envelope, silently dropping all query params from the actual HTTP call.

Fix replaces the `infer`-based patterns with direct property indexing (`GetBucket<R, K>` + `NonNullable`) in `types.ts`, and adds `.unwrap()` fallback support to `getShape` in `flatten.ts`.
