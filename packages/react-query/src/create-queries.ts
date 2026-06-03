import {
  type ApiClientWithRouter,
  type EndpointSpec,
  isRouterDef,
  type RouterEndpoints,
} from "@routar/core";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { isRoutarMutationCacheWired } from "./mutation-cache.js";
import type { CreateQueriesOptions, Queries } from "./types.js";
import {
  buildInfiniteKey,
  buildQueryKey,
  prefixToSegments,
} from "./utils/key.js";

type EndpointDefault = Record<string, unknown>;

/**
 * Derives TanStack Query accessors from a routar API client.
 * GET endpoints become query-options factories; other methods become
 * mutation-options factories. The returned object mirrors the client shape.
 *
 * The router does not need to be re-passed — {@link createApi} stamps it on the
 * client's `$router` property, and it is recovered here.
 */
export function createQueries<TEndpoints extends RouterEndpoints>(
  api: ApiClientWithRouter<TEndpoints>,
  options?: CreateQueriesOptions<TEndpoints>,
): Queries<TEndpoints> {
  const router = api.$router;
  const root = options?.key ? [options.key] : prefixToSegments(router.prefix);
  return buildQueries(
    api as unknown as Record<string, unknown>,
    router.endpoints,
    root,
    options?.defaults as Record<string, EndpointDefault> | undefined,
  ) as Queries<TEndpoints>;
}

function buildQueries(
  apiNode: Record<string, unknown>,
  endpoints: RouterEndpoints,
  root: string[],
  // Per-endpoint defaults apply at the top level only; nested routers get none.
  defaults: Record<string, EndpointDefault> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = { $key: root };

  for (const [name, entry] of Object.entries(endpoints)) {
    if (isRouterDef(entry)) {
      const childRoot = [...root, ...prefixToSegments(entry.prefix)];
      out[name] = buildQueries(
        apiNode[name] as Record<string, unknown>,
        entry.endpoints,
        childRoot,
        undefined,
      );
      continue;
    }
    const spec = entry as EndpointSpec<any, any, any>;
    const fn = apiNode[name] as (
      params?: unknown,
      signal?: AbortSignal,
    ) => Promise<unknown>;
    const endpointDefault = defaults?.[name];
    out[name] =
      spec.method === "GET"
        ? makeQueryAccessor(fn, root, name, endpointDefault)
        : makeMutationAccessor(fn, root, name, endpointDefault);
  }

  return out;
}

/** Recursively merges plain objects (arrays/primitives from `source` win). */
function deepMerge(
  base: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(source)) {
    const prev = out[key];
    out[key] =
      isPlainObject(prev) && isPlainObject(value)
        ? deepMerge(prev, value)
        : value;
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function makeQueryAccessor(
  fn: (params?: unknown, signal?: AbortSignal) => Promise<unknown>,
  root: string[],
  name: string,
  endpointDefault: EndpointDefault | undefined,
) {
  const accessor = (params?: unknown, options?: Record<string, unknown>) =>
    queryOptions({
      queryKey: buildQueryKey(root, name, params),
      queryFn: ({ signal }) => fn(params, signal),
      ...endpointDefault,
      ...options,
    });
  accessor.queryKey = (params?: unknown) => buildQueryKey(root, name, params);

  const infinite = (
    params: unknown,
    options: {
      pageParam: (pageParam: unknown) => Record<string, unknown>;
      [k: string]: unknown;
    },
  ) => {
    const { pageParam, ...rest } = options;
    return infiniteQueryOptions({
      queryKey: buildInfiniteKey(root, name, params),
      queryFn: ({
        pageParam: page,
        signal,
      }: {
        pageParam: unknown;
        signal: AbortSignal;
      }) => {
        const base = isPlainObject(params) ? params : {};
        return fn(deepMerge(base, pageParam(page)), signal);
      },
      ...endpointDefault,
      ...rest,
      // `rest` (spread) hides initialPageParam/getNextPageParam from the static
      // type, but they are present at runtime — assert through unknown.
    } as unknown as Parameters<typeof infiniteQueryOptions>[0]);
  };
  infinite.queryKey = (params?: unknown) =>
    buildInfiniteKey(root, name, params);
  accessor.infinite = infinite;

  return accessor;
}

let warnedUnwiredInvalidates = false;

function makeMutationAccessor(
  fn: (vars?: unknown) => Promise<unknown>,
  root: string[],
  name: string,
  endpointDefault: EndpointDefault | undefined,
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
      ...endpointDefault,
      ...rest,
    };
    if (invalidates) {
      warnUnwiredInvalidates();
      merged.meta = { ...(rest.meta ?? {}), invalidates };
    }
    return merged;
  };
  accessor.mutationKey = mutationKey;
  return accessor;
}

/**
 * Warns once (dev only) when a mutation declares `invalidates` but no
 * {@link routarMutationCache} is wired to process it — otherwise the
 * invalidation silently never runs.
 */
function warnUnwiredInvalidates(): void {
  if (
    warnedUnwiredInvalidates ||
    isRoutarMutationCacheWired() ||
    process.env.NODE_ENV === "production"
  ) {
    return;
  }
  warnedUnwiredInvalidates = true;
  console.warn(
    "[@routar/react-query] a mutation declared `invalidates`, but `routarMutationCache` " +
      "is not wired into your QueryClient — the invalidation will not run. Wire it once at " +
      "QueryClient creation: `new QueryClient({ mutationCache: routarMutationCache(() => queryClient) })`.",
  );
}
