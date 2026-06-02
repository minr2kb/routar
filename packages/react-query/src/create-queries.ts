import { isRouterDef } from "@routar/core";
import type { ApiClient, EndpointSpec, RouterDef, RouterEndpoints } from "@routar/core";
import { queryOptions } from "@tanstack/react-query";
import type { CreateQueriesOptions, Queries } from "./types.js";
import { buildQueryKey, prefixToSegments } from "./utils/key.js";

/**
 * Derives TanStack Query accessors from a routar API client + router.
 * GET endpoints become query-options factories; other methods become
 * mutation-options factories. The returned object mirrors the client shape.
 */
export function createQueries<TEndpoints extends RouterEndpoints>(
  api: ApiClient<TEndpoints>,
  router: RouterDef<TEndpoints>,
  options?: CreateQueriesOptions,
): Queries<TEndpoints> {
  const root = options?.key ? [options.key] : prefixToSegments(router.prefix);
  return buildQueries(api as Record<string, unknown>, router.endpoints, root) as Queries<TEndpoints>;
}

function buildQueries(
  apiNode: Record<string, unknown>,
  endpoints: RouterEndpoints,
  root: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { $key: root };

  for (const [name, entry] of Object.entries(endpoints)) {
    if (isRouterDef(entry)) {
      const childRoot = [...root, ...prefixToSegments(entry.prefix)];
      out[name] = buildQueries(
        apiNode[name] as Record<string, unknown>,
        entry.endpoints,
        childRoot,
      );
      continue;
    }
    const spec = entry as EndpointSpec<any, any, any>;
    const fn = apiNode[name] as (params?: unknown, signal?: AbortSignal) => Promise<unknown>;
    out[name] =
      spec.method === "GET"
        ? makeQueryAccessor(fn, root, name)
        : makeMutationAccessor(fn, root, name);
  }

  return out;
}

function makeQueryAccessor(
  fn: (params?: unknown, signal?: AbortSignal) => Promise<unknown>,
  root: string[],
  name: string,
) {
  const accessor = (params?: unknown, options?: Record<string, unknown>) =>
    queryOptions({
      queryKey: buildQueryKey(root, name, params),
      queryFn: ({ signal }) => fn(params, signal),
      ...options,
    });
  accessor.queryKey = (params?: unknown) => buildQueryKey(root, name, params);
  return accessor;
}

function makeMutationAccessor(
  fn: (vars?: unknown) => Promise<unknown>,
  root: string[],
  name: string,
) {
  const mutationKey = [...root, name];
  const accessor = (options: Record<string, unknown> = {}) => {
    const { invalidates, ...rest } = options as {
      invalidates?: unknown[];
      meta?: Record<string, unknown>;
    };
    const merged: Record<string, unknown> = {
      mutationKey,
      mutationFn: (vars: unknown) => fn(vars),
      ...rest,
    };
    if (invalidates) {
      merged.meta = { ...(rest.meta ?? {}), invalidates };
    }
    return merged;
  };
  accessor.mutationKey = mutationKey;
  return accessor;
}
