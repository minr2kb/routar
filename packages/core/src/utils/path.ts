/**
 * Joins URL path segments, normalising repeated slashes and trailing slashes.
 *
 * **Note:** Intended for relative API paths only. Absolute URLs containing
 * `://` will be collapsed (`https://` → `https:/`). Pass absolute URLs
 * directly to the executor instead of through this helper.
 */
export function joinPaths(...segments: string[]): string {
  const joined = segments
    .filter((s) => s !== "")
    .join("/")
    .replace(/\/+/g, "/");
  return joined.endsWith("/") && joined.length > 1
    ? joined.slice(0, -1)
    : joined || "/";
}

export function resolvePath(
  pathTemplate: string,
  params?: Record<string, unknown>,
): string {
  if (!params) return pathTemplate;
  return pathTemplate.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => {
    const value = params[key];
    if (value == null || value === "") throw new Error(`Missing path parameter: ${key}`);
    return encodeURIComponent(String(value));
  });
}
