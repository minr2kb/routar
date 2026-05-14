export function joinPaths(...segments: string[]): string {
  // Join path segments, normalize slashes
  // '' + '/todos' + '/' → '/todos'
  // '/todos' + '/:id' → '/todos/:id'
  const joined = segments
    .filter(s => s !== '')
    .join('/')
    .replace(/\/+/g, '/');
  // Remove trailing slash unless it's the root
  return joined.endsWith('/') && joined.length > 1
    ? joined.slice(0, -1)
    : joined || '/';
}

export function resolvePath(
  pathTemplate: string,
  params?: Record<string, unknown>,
): string {
  // Replace :param placeholders with values from params
  // '/todos/:id' + { id: 1 } → '/todos/1'
  if (!params) return pathTemplate;
  return pathTemplate.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => {
    const value = params[key];
    if (value == null) throw new Error(`Missing path parameter: ${key}`);
    return encodeURIComponent(String(value));
  });
}
