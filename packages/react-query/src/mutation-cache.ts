import type {
  QueryClientConfig,
  QueryKey,
} from "@tanstack/react-query";
import { MutationCache, QueryClient } from "@tanstack/react-query";

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

/**
 * Creates a {@link QueryClient} with {@link routarMutationCache} already wired,
 * removing the self-referencing boilerplate (SE-8):
 *
 * ```ts
 * // Before — manual self-reference:
 * let queryClient: QueryClient;
 * queryClient = new QueryClient({
 *   mutationCache: routarMutationCache(() => queryClient),
 * });
 *
 * // After:
 * const queryClient = routarQueryClient();
 * ```
 *
 * Pass any normal {@link QueryClientConfig} (e.g. `defaultOptions`); it is
 * forwarded unchanged. If you supply your own `mutationCache`, it is respected
 * and routar's is **not** wired — so `invalidates` won't run unless your cache
 * handles `meta.invalidates` itself.
 */
export function routarQueryClient(config?: QueryClientConfig): QueryClient {
  let client: QueryClient;
  client = new QueryClient({
    ...config,
    mutationCache: config?.mutationCache ?? routarMutationCache(() => client),
  });
  return client;
}
