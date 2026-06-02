/** Splits a router prefix (e.g. `/api/v1/todos`) into its non-empty path segments. */
export function prefixToSegments(prefix: string): string[] {
  return prefix.split("/").filter(Boolean);
}

/**
 * Builds a query key of shape `[...root, endpointName, params]`.
 * When `params` is `undefined`, the trailing element is omitted so that the
 * generated `queryOptions` key and the standalone `.queryKey()` key match.
 */
export function buildQueryKey(
  root: readonly string[],
  endpointName: string,
  params: unknown,
): unknown[] {
  return params === undefined
    ? [...root, endpointName]
    : [...root, endpointName, params];
}
