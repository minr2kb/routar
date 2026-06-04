---
"@routar/react-query": patch
---

Fix broken external install: `@routar/react-query` declared its runtime
dependency on `@routar/core` using the `workspace:*` protocol, which
`bun x changeset publish` did not rewrite to a real version. The published
`1.4.0` therefore shipped `"@routar/core": "workspace:*"`, which npm/yarn/pnpm
cannot resolve — `npm install @routar/react-query` failed for external users.

The dependency is now a publishable semver range (`^1.4.x`). Bun still links the
local workspace package during development, changesets bumps the range on each
release (fixed group + `updateInternalDependencies`), and the published manifest
carries a valid range.
