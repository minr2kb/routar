---
"@routar/react-query": minor
---

`routarMutationCache(getQueryClient, overrides?)` now accepts an optional second argument forwarding any other `MutationCache` callback (`onError`, `onSettled`, `onMutate`, …) alongside the built-in `invalidates` handling. Previously, using a custom `onError` required reimplementing the `meta.invalidates` logic by hand in a separate `MutationCache`, which left `routarMutationCache` unwired and produced a spurious "not wired" warning even though invalidation worked. `onSuccess` stays library-owned and is omitted from the `overrides` type.

```ts
routarMutationCache(() => queryClient, {
  onError: (error) => notifyMutationNetworkError(error),
});
```
