import { isServer, QueryClient } from "@tanstack/react-query";
import { routarMutationCache } from "@routar/react-query";

function makeQueryClient() {
  let queryClient: QueryClient;
  queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000 } },
    mutationCache: routarMutationCache(() => queryClient),
  });
  return queryClient;
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
