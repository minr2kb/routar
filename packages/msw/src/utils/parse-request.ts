export function parseQueryFromUrl(
  url: string,
): Record<string, string | string[]> {
  const { searchParams } = new URL(url);
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    result[key] = values.length === 1 ? values[0]! : values;
  }
  return result;
}

export async function parseBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return undefined;
  const text = await request.text();
  return text ? JSON.parse(text) : undefined;
}
