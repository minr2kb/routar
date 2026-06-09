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
  type BucketMap,
  captureBuckets,
  toEnvelope,
} from "./utils/flatten.js";
import {
  buildInfiniteKey,
  buildQueryKey,
  prefixToSegments,
} from "./utils/key.js";

// A per-endpoint default: either a static options object, or a lazy
// `(params, q) => options` function. Typed loosely here (the public surface is
// strongly typed via EndpointDefaults); the runtime only branches on `typeof`.
type EndpointDefault =
  | Record<string, unknown>
  | ((params: unknown, q: Queries<RouterEndpoints>) => Record<string, unknown>);
type InfiniteConfig = Record<string, unknown>;

/**
 * Derives TanStack Query accessors from a routar API client.
 * GET endpoints become query-options factories; other methods become
 * mutation-options factories. The returned object mirrors the client shape.
 *
 * The router does not need to be re-passed — {@link createApi} stamps it on the
 * client's `$router` property, and it is recovered here.
 *
 * `options.defaults` values may be static objects **or functions**
 * `(params, q) => options`, evaluated lazily against the fully-built `q`. Use the
 * function form to reference sibling key helpers (e.g. in `invalidates`) without
 * circular-variable issues — `params` is the call params for queries, or
 * `undefined` for mutations.
 *
 * Priority (low → high): static/dynamic default < per-call options.
 *
 * @example
 * ```ts
 * const todoQuery = createQueries(todoApi, {
 *   infinite: { getList: { initialPageParam: 1, getNextPageParam, pageParam } },
 *   defaults: {
 *     // dynamic default: `q` is fully built, so its key helpers are safe to use
 *     create: (_, q) => ({ invalidates: [q.getList.queryKey()] }),
 *   },
 * })
 * ```
 *
 * Set `flatten: true` to call accessors with flat params (the union of the
 * request's `path`/`query`/`body` fields) instead of the nested envelope. The
 * query key is always built from the envelope, so call styles converge on SSR/CSR.
 */
export function createQueries<
  TEndpoints extends RouterEndpoints,
  TFlatten extends boolean = false,
>(
  api: ApiClientWithRouter<TEndpoints>,
  options?: CreateQueriesOptions<TEndpoints, TFlatten>,
): Queries<TEndpoints, TFlatten> {
  const router = api.$router;

  const root = options?.key ? [options.key] : prefixToSegments(router.prefix);

  // Late-bound ref: dynamic defaults reference `q`, which is itself built from
  // those defaults. We hand accessors an empty container, build the tree, then
  // populate the container — by the time any accessor (and thus any dynamic
  // default) runs, `qRef` is fully assembled.
  const qRef = {} as Queries<RouterEndpoints>;

  const result = buildQueries(
    api as unknown as Record<string, unknown>,
    router.endpoints,
    root,
    options?.defaults as Record<string, EndpointDefault> | undefined,
    options?.infinite as Record<string, InfiniteConfig> | undefined,
    options?.flatten === true,
    qRef,
  );
  Object.assign(qRef, result);
  return qRef as unknown as Queries<TEndpoints, TFlatten>;
}

function buildQueries(
  apiNode: Record<string, unknown>,
  endpoints: RouterEndpoints,
  root: string[],
  // Per-endpoint defaults + infinite config; for a nested router, the value at
  // its key is the nested config map, recursed into the sub-tree.
  defaults: Record<string, EndpointDefault> | undefined,
  infinite: Record<string, InfiniteConfig> | undefined,
  flatten: boolean,
  qRef: Queries<RouterEndpoints>,
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
        flatten,
        qRef,
      );
      continue;
    }
    const spec = entry as EndpointSpec<any, any, any>;
    const fn = apiNode[name] as (
      params?: unknown,
      signal?: AbortSignal,
    ) => Promise<unknown>;
    const endpointDefault = defaults?.[name];
    // Capture flatten buckets once per endpoint; `null`/non-flattenable → identity.
    const buckets = flatten ? captureBuckets(spec.request) : null;
    out[name] =
      spec.method === "GET"
        ? makeQueryAccessor(
            fn,
            root,
            name,
            endpointDefault,
            infinite?.[name],
            buckets,
            qRef,
          )
        : makeMutationAccessor(fn, root, name, endpointDefault, buckets, qRef);
  }

  return out;
}

/**
 * Resolves a per-endpoint default: invokes the function form with `(params,
 * qRef)`, or returns the static object as-is.
 */
function resolveDefault(
  d: EndpointDefault | undefined,
  params: unknown,
  qRef: Queries<RouterEndpoints>,
): Record<string, unknown> | undefined {
  if (d === undefined) return undefined;
  return typeof d === "function" ? d(params, qRef) : d;
}

/**
 * Normalizes flat params into the request envelope when flattening is active.
 * `buckets` is `null` (no flatten) or non-flattenable → the params pass through.
 */
function normalize(params: unknown, buckets: BucketMap | null): unknown {
  if (buckets === null || !buckets.flattenable) return params;
  return toEnvelope(params, buckets);
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
  buckets: BucketMap | null,
  qRef: Queries<RouterEndpoints>,
) {
  const accessor = (params?: unknown, options?: Record<string, unknown>) => {
    // In flatten mode `params` is flat; the envelope drives both fetch and key.
    const envelope = normalize(params, buckets);
    return queryOptions({
      queryKey: buildQueryKey(root, name, envelope),
      queryFn: ({ signal }) => fn(envelope, signal),
      ...resolveDefault(endpointDefault, params, qRef),
      ...options,
    });
  };
  // queryKey helper stays on the envelope params (flatten-independent), so SSR
  // and CSR keys match regardless of call style.
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

    // In flatten mode the base params are flat → normalize to the envelope for
    // both the key and the fetch (the pageParam builder still targets envelope).
    const envelope = normalize(params, buckets);
    return infiniteQueryOptions({
      queryKey: buildInfiniteKey(root, name, envelope),
      queryFn: ({
        pageParam: page,
        signal,
      }: {
        pageParam: unknown;
        signal: AbortSignal;
      }) => {
        const base = isPlainObject(envelope) ? envelope : {};
        return fn(deepMerge(base, pageParam(page)), signal);
      },
      initialPageParam,
      getNextPageParam,
      ...resolveDefault(endpointDefault, params, qRef),
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
  buckets: BucketMap | null,
  qRef: Queries<RouterEndpoints>,
) {
  const mutationKey = [...root, name];

  const accessor = (options: Record<string, unknown> = {}) => {
    // Resolve the default lazily — a dynamic default needs the populated qRef.
    // Mutations have no fixed call params, so `params` is undefined.
    const {
      invalidates: defaultInvalidates,
      meta: defaultMeta,
      ...restDefault
    } = (resolveDefault(endpointDefault, undefined, qRef) ?? {}) as {
      invalidates?: unknown[];
      meta?: Record<string, unknown>;
    } & Record<string, unknown>;

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
      // In flatten mode vars are flat → normalize to the envelope before fetch.
      mutationFn: (vars: unknown) => fn(normalize(vars, buckets)),
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
