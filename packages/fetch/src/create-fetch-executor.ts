import type { Executor, ExecutorMiddleware } from "@routar/core";
import { createExecutor, serializeParams } from "@routar/core";

/**
 * Creates an {@link Executor} backed by the browser / Node.js `fetch` API.
 *
 * Suited for SSR environments where you need per-request dynamic headers
 * (e.g. forwarding auth cookies) without sharing state across requests.
 *
 * - Query params are serialized and appended to the URL.
 * - A `Content-Type: application/json` header is added automatically when
 *   a request body is present.
 * - Responses with status 204 or `Content-Length: 0` resolve to `null`.
 * - Non-2xx responses throw an {@link HttpError}.
 *
 * @param baseURL - Absolute base URL prepended to every endpoint path.
 * @param options.defaultHeaders - Async factory called on every request to
 *   produce headers (e.g. reading cookies in a Next.js server component).
 * @param options.middlewares - Middleware chain applied before the fetch call.
 *
 * @example
 * ```ts
 * const executor = createFetchExecutor('https://api.example.com', {
 *   defaultHeaders: async () => {
 *     const token = await getServerToken();
 *     return token ? { Authorization: `Bearer ${token}` } : {};
 *   },
 * });
 * ```
 */
export function createFetchExecutor(
  baseURL: string,
  options?: {
    defaultHeaders?: () =>
      | Record<string, string>
      | Promise<Record<string, string>>;
    middlewares?: ExecutorMiddleware[];
  },
): Executor {
  return createExecutor(
    async ({ method, url, params, body, headers, signal }) => {
      const fullURL = new URL(baseURL.replace(/\/$/, "") + url);
      if (params) {
        serializeParams(params).forEach((v, k) => {
          fullURL.searchParams.set(k, v);
        });
      }

      const defaultHeaders = (await options?.defaultHeaders?.()) ?? {};

      const res = await fetch(fullURL.toString(), {
        method,
        headers: {
          ...(body != null ? { "Content-Type": "application/json" } : {}),
          ...defaultHeaders,
          ...headers,
        },
        body: body != null ? JSON.stringify(body) : undefined,
        signal,
      });

      if (!res.ok) {
        throw new HttpError(res.status, res.statusText);
      }
      if (res.status === 204 || res.headers.get("content-length") === "0") {
        return null;
      }
      return res.json();
    },
    options?.middlewares,
  );
}

/**
 * Thrown by {@link createFetchExecutor} when the server returns a non-2xx
 * status code.
 *
 * @example
 * ```ts
 * try {
 *   await api.getDetail({ path: { id: 999 } });
 * } catch (err) {
 *   if (err instanceof HttpError && err.status === 404) {
 *     // handle not-found
 *   }
 * }
 * ```
 */
export class HttpError extends Error {
  constructor(
    /** HTTP status code (e.g. 404, 500). */
    public readonly status: number,
    /** HTTP status text (e.g. "Not Found"). */
    public readonly statusText: string,
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "HttpError";
  }
}
