/** Splits a router prefix (e.g. `/api/v1/todos`) into its non-empty path segments. */
export function prefixToSegments(prefix: string): string[] {
  return prefix.split("/").filter(Boolean);
}

/**
 * True when `params` carries no information for the key — `undefined`/`null`, or
 * a plain object with no own keys (`{}`). Normalizing these to the same shape
 * keeps `getList()` and `getList({})` on an identical key, which avoids an SSR
 * hydration miss when a server `prefetchQuery(getList())` meets a client
 * `useSuspenseQuery(getList({}))`.
 */
function isEmptyParams(params: unknown): boolean {
  if (params == null) return true;
  if (typeof params === "object" && !Array.isArray(params)) {
    return Object.keys(params as object).length === 0;
  }
  return false;
}

/**
 * Builds a query key of shape `[...root, endpointName, params]`.
 * When `params` is empty (`undefined`, `null`, or `{}`), the trailing element is
 * omitted so that the generated `queryOptions` key and the standalone
 * `.queryKey()` key are always identical regardless of `()` vs `({})` call style.
 */
export function buildQueryKey(
  root: readonly string[],
  endpointName: string,
  params: unknown,
): unknown[] {
  return isEmptyParams(params)
    ? [...root, endpointName]
    : [...root, endpointName, params];
}

/**
 * Builds an infinite query key of shape `[...root, endpointName, "infinite", params]`.
 * The `"infinite"` segment keeps it distinct from the standard query key while
 * staying a prefix-child of `[...root, endpointName]`, so invalidating the
 * standard key (or the domain `$key`) also covers the infinite variant. Empty
 * params are normalized exactly like {@link buildQueryKey}.
 */
export function buildInfiniteKey(
  root: readonly string[],
  endpointName: string,
  params: unknown,
): unknown[] {
  return isEmptyParams(params)
    ? [...root, endpointName, "infinite"]
    : [...root, endpointName, "infinite", params];
}
