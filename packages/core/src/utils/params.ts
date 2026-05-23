export function serializeParams(
  params: Record<string, unknown>,
): URLSearchParams {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) result.append(key, String(item));
      }
    } else if (typeof value === "object") {
      throw new TypeError(
        `serializeParams: value for key "${key}" is a plain object. Serialize it to a string before passing as a query parameter.`,
      );
    } else {
      result.append(key, String(value));
    }
  }
  return result;
}
