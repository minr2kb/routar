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
type InfiniteConfig = Record<string, unknown>;

/**
 * Derives TanStack Query accessors from a routar API client.
 * GET endpoints become query-options factories; other methods become
 * mutation-options factories. The returned object mirrors the client shape.
 *
 * The router does not need to be re-passed — {@link createApi} stamps it on the
 * client's `$router` property, and it is recovered here.
 *
 * `options` may be a plain object **or a factory function** that receives a
 * preliminary queries object — useful for referencing sibling key helpers inside
 * `defaults.invalidates` without circular-variable issues:
 *
 * @example
 * ```ts
 * const todoQuery = createQueries(todoApi, (q) => ({
 *   infinite: { getList: { initialPageParam: 1, getNextPageParam, pageParam } },
 *   defaults: {
 *     create: { invalidates: [q.getList.queryKey()] },
 *   },
 * }))
 * ```
 *
 * The `q` passed to the factory has no defaults or infinite config applied yet,
 * so use it only for key helpers (`.queryKey()`, `.$key`, `.mutationKey`).
 * Calling `.infinite()` inside the factory throws — its contract isn't set yet.
 */
export function createQueries<TEndpoints extends RouterEndpoints>(
  api: ApiClientWithRouter<TEndpoints>,
  options?:
    | CreateQueriesOptions<TEndpoints>
    | ((q: Queries<TEndpoints>) => CreateQueriesOptions<TEndpoints>),
): Queries<TEndpoints> {
  const router = api.$router;

  let resolved: CreateQueriesOptions<TEndpoints> | undefined;
  if (typeof options === "function") {
    // Build a structural-only base (no defaults, no infinite) for the factory to
    // reference — key helpers work, but don't call accessor fns inside the factory.
    const baseRoot = prefixToSegments(router.prefix);
    const base = buildQueries(
      api as unknown as Record<string, unknown>,
      router.endpoints,
      baseRoot,
      undefined,
      undefined,
    ) as Queries<TEndpoints>;
    resolved = options(base);
  } else {
    resolved = options;
  }

  const root = resolved?.key ? [resolved.key] : prefixToSegments(router.prefix);
  return buildQueries(
    api as unknown as Record<string, unknown>,
    router.endpoints,
    root,
    resolved?.defaults as Record<string, EndpointDefault> | undefined,
    resolved?.infinite as Record<string, InfiniteConfig> | undefined,
  ) as Queries<TEndpoints>;
}

function buildQueries(
  apiNode: Record<string, unknown>,
  endpoints: RouterEndpoints,
  root: string[],
  // Per-endpoint defaults + infinite config; for a nested router, the value at
  // its key is the nested config map, recursed into the sub-tree.
  defaults: Record<string, EndpointDefault> | undefined,
  infinite: Record<string, InfiniteConfig> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = { $key: root };

  for (const [name, entry] of Object.entries(endpoints)) {
    if (isRouterDef(entry)) {
      const childRoot = [...root, ...prefixToSegments(entry.prefix)];
      out[name] = buildQueries(
        apiNode[name] as Record<string, unknown>,
        entry.endpoints,
        childRoot,
        defaults?.[name] as Record<string, EndpointDefault> | undefined,
        infinite?.[name] as Record<string, InfiniteConfig> | undefined,
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
        ? makeQueryAccessor(fn, root, name, endpointDefault, infinite?.[name])
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
  infiniteConfig: InfiniteConfig | undefined,
) {
  const accessor = (params?: unknown, options?: Record<string, unknown>) =>
    queryOptions({
      queryKey: buildQueryKey(root, name, params),
      queryFn: ({ signal }) => fn(params, signal),
      ...endpointDefault,
      ...options,
    });
  accessor.queryKey = (params?: unknown) => buildQueryKey(root, name, params);

  const infinite = (params?: unknown, override?: Record<string, unknown>) => {
    // Contract = per-endpoint config (createQueries) overlaid with per-call opts.
    const merged = { ...infiniteConfig, ...override };
    const { pageParam, initialPageParam, getNextPageParam, ...rest } =
      merged as {
        pageParam?: (p: unknown) => Record<string, unknown>;
        initialPageParam?: unknown;
        getNextPageParam?: unknown;
      } & Record<string, unknown>;

    if (
      typeof pageParam !== "function" ||
      initialPageParam === undefined ||
      typeof getNextPageParam !== "function"
    ) {
      throw new Error(
        `[@routar/react-query] infinite query "${name}" is missing its pagination ` +
          "contract. Declare it in createQueries({ infinite: { " +
          `${name}: { initialPageParam, getNextPageParam, pageParam } } }) ` +
          "or pass it at the call site.",
      );
    }

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
      initialPageParam,
      getNextPageParam,
      ...endpointDefault,
      ...rest,
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

  // Extract invalidates and meta from defaults explicitly — spreading them as
  // raw keys would leave invalidates at the top level where routarMutationCache
  // never looks (it reads meta.invalidates only).
  const {
    invalidates: defaultInvalidates,
    meta: defaultMeta,
    ...restDefault
  } = (endpointDefault ?? {}) as {
    invalidates?: unknown[];
    meta?: Record<string, unknown>;
  } & Record<string, unknown>;

  const accessor = (options: Record<string, unknown> = {}) => {
    const {
      invalidates: callInvalidates,
      meta: callMeta,
      ...rest
    } = options as {
      invalidates?: unknown[];
      meta?: Record<string, unknown>;
    } & Record<string, unknown>;

    // Call-site invalidates wins; fall back to default.
    const invalidates = callInvalidates ?? defaultInvalidates;

    const merged: Record<string, unknown> = {
      mutationKey,
      mutationFn: (vars: unknown) => fn(vars),
      ...restDefault,
      ...rest,
    };

    // Merge meta: default < call-site, then attach invalidates.
    const mergedMeta: Record<string, unknown> = {
      ...(defaultMeta ?? {}),
      ...(callMeta ?? {}),
    };
    if (invalidates) {
      warnUnwiredInvalidates();
      mergedMeta.invalidates = invalidates;
    }
    if (Object.keys(mergedMeta).length > 0) {
      merged.meta = mergedMeta;
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
