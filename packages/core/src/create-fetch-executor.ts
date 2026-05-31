import type { CreateExecutorOptions, ExecuteOptions, Executor, ExecutorMiddleware } from "./types.js";
import { createExecutor } from "./create-executor.js";
import { withRetry, withTimeout } from "./middleware.js";
import { serializeParams } from "./utils/params.js";

export type FetchRetryOption =
  | number
  | { count: number; shouldRetry?: (error: unknown, attempt: number) => boolean };

export interface FetchExecutorOptions extends CreateExecutorOptions {
  defaultHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  retry?: FetchRetryOption;
  timeout?: number;
}

function buildFetchChain(
  transport: (opts: ExecuteOptions) => Promise<unknown>,
  retry?: FetchRetryOption,
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
  if (middlewares.length === 0) return transport;
  return middlewares.reduceRight<(opts: ExecuteOptions) => Promise<unknown>>(
    (next, mw) => (opts) => mw(opts, next),
    transport,
  );
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
 * @param options.plugins - Plugins applied before the fetch call.
 * @param options.retry - Number of retries, or `{ count, shouldRetry? }`.
 * @param options.timeout - Per-attempt timeout in milliseconds.
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
 * @example With retry and timeout
 * ```ts
 * const executor = createFetchExecutor('https://api.example.com', {
 *   retry: 2,
 *   timeout: 8_000,
 * });
 * ```
 */
export function createFetchExecutor(
  baseURL: string,
  options?: FetchExecutorOptions,
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
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown = null,
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "HttpError";
  }
}
