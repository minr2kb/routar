# @routar/fetch

## 0.1.1

### Patch Changes

- 03d7d93: Fix URL construction when baseURL contains a path prefix.

  `new URL(url, base)` drops the base path when `url` starts with `/` — e.g.
  `new URL('/todos', 'http://host/api')` resolves to `http://host/todos`, not
  `http://host/api/todos`. Both executors now use string concatenation
  (`base + url`) so a baseURL like `http://host/api` correctly produces
  `http://host/api/todos`.
