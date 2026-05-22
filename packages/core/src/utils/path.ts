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
    if (value == null) throw new Error(`Missing path parameter: ${key}`);
    return encodeURIComponent(String(value));
  });
}
