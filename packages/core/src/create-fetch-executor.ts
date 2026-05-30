import type { CreateExecutorOptions, ExecuteOptions, Executor, ExecutorMiddleware } from "./types.js";
import { buildChain, createExecutor } from "./create-executor.js";
import { withRetry, withTimeout } from "./middleware.js";
import { serializeParams } from "./utils/params.js";

type RetryOption =
  | number
  | { count: number; shouldRetry?: (error: unknown, attempt: number) => boolean };

function buildFetchChain(
  transport: (opts: ExecuteOptions) => Promise<unknown>,
  retry?: RetryOption,
  timeout?: number,
): (opts: ExecuteOptions) => Promise<unknown> {
  const middlewares: ExecutorMiddleware[] = [
    ...(retry != null
      ? [
          typeof retry === "number"
            ? withRetry(retry)
            : withRetry(retry.count, { shouldRetry: retry.shouldRetry }),
        ]
      : []),
    ...(timeout != null ? [withTimeout(timeout)] : []),
  ];
  return middlewares.length > 0 ? buildChain(transport, middlewares) : transport;
}

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
 * @example Minimal — no options needed
 * ```ts
 * const executor = createFetchExecutor('https://api.example.com');
 * ```
 *
 * @example SSR with bearer token
 * ```ts
 * const executor = createFetchExecutor('https://api.example.com', {
 *   defaultHeaders: async () => {
 *     const token = await getServerToken();
 *     return token ? { Authorization: `Bearer ${token}` } : {};
 *   },
 * });
 * ```
 *
 * @example Next.js App Router — forward cookies from the incoming request
 * ```ts
 * const executor = createFetchExecutor('https://api.example.com', {
 *   defaultHeaders: async () => {
 *     const { cookies } = await import('next/headers');
 *     const token = (await cookies()).get('access_token')?.value;
 *     return token ? { Authorization: `Bearer ${token}` } : {};
 *   },
 *   middlewares: [withTimeout(8_000), withRetry(2)],
 * });
 * ```
 */
export function createFetchExecutor(
  baseURL: string,
  options?: CreateExecutorOptions & {
    defaultHeaders?: () =>
      | Record<string, string>
      | Promise<Record<string, string>>;
    retry?: RetryOption;
    timeout?: number;
  },
): Executor {
  const transport = async ({
    method,
    url,
    params,
    body,
    headers,
    signal,
  }: ExecuteOptions) => {
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
        ...defaultHeaders,
        ...headers,
        ...(body != null ? { "Content-Type": "application/json" } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      throw new HttpError(res.status, res.statusText, errorBody);
    }
    if (res.status === 204 || res.status === 205 || res.status === 304) {
      return null;
    }
    const text = await res.text();
    return text === "" ? null : JSON.parse(text);
  };

  const wrappedTransport = buildFetchChain(transport, options?.retry, options?.timeout);
  return createExecutor(wrappedTransport, { plugins: options?.plugins });
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
    /** Parsed response body, or `null` if the body was empty or not JSON. */
    public readonly body: unknown = null,
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "HttpError";
  }
}
