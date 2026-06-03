import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { MutationCache } from "@tanstack/react-query";

let cacheWired = false;

/**
 * Whether {@link routarMutationCache} has been constructed in this runtime.
 * Used only for a dev-time warning when a mutation declares `invalidates`
 * but no cache is wired to process it. Best-effort: a module-level flag, so
 * it can produce a false warning if an accessor with `invalidates` runs before
 * any `QueryClient` is created.
 * @internal
 */
export function isRoutarMutationCacheWired(): boolean {
  return cacheWired;
}

/**
 * Builds a {@link MutationCache} that reads `mutation.meta.invalidates` and
 * invalidates each listed query key on success. Pass a getter for the
 * {@link QueryClient} to resolve the construction order (the cache is created
 * before the client):
 *
 * ```ts
 * let queryClient: QueryClient;
 * queryClient = new QueryClient({
 *   mutationCache: routarMutationCache(() => queryClient),
 * });
 * ```
 */
export function routarMutationCache(
  getQueryClient: () => QueryClient,
): MutationCache {
  cacheWired = true;
  return new MutationCache({
    onSuccess: (_data, _vars, _onMutateResult, mutation) => {
      const invalidates = mutation.meta?.invalidates as QueryKey[] | undefined;
      if (!invalidates?.length) return;
      const qc = getQueryClient();
      for (const queryKey of invalidates) {
        qc.invalidateQueries({ queryKey });
      }
    },
  });
}
