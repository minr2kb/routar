import { MutationCache } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

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
