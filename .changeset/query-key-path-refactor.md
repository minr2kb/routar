---
"@routar/react-query": patch
---

Refactor `queryKey` and `mutationKey` generation to use the endpoint's `path` instead of its `name`. This is a breaking change for users relying on the previous key structure for manual invalidation.
