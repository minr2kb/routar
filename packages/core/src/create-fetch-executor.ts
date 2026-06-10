import type { CreateExecutorOptions, ExecuteOptions, Executor, ExecutorMiddleware } from "./types.js";
import { buildChain, createExecutor } from "./create-executor.js";
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
  return buildChain(transport, middlewares);
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
 *   Accepts a static string or a sync/async factory called on every request —
 *   useful when the origin depends on runtime environment (e.g. SSR vs CSR).
 * @param options.defaultHeaders - Async factory called on every request to
 *   produce headers (e.g. reading cookies in a Next.js server component).
 * @param options.plugins - Plugins applied around the fetch call. Each retry
 *   attempt re-runs `onRequest` hooks (so headers are refreshed per attempt)
 *   and `onError` hooks. Token-refresh-on-401 patterns work by updating an
 *   external token store in `onError` and letting `onRequest` pick it up on
 *   the next attempt.
 * @param options.retry - Number of retries, or `{ count, shouldRetry? }`.
 * @param options.timeout - Per-attempt timeout in milliseconds.
 *
 * @example Minimal — no options needed
 * ```ts
 * const executor = createFetchExecutor('https://api.example.com');
 * ```
 *
 * @example Dynamic base URL for SSR/CSR
 * ```ts
 * const executor = createFetchExecutor(
 *   () => typeof window === 'undefined' ? 'http://localhost:3000/api' : '/api',
 * );
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
  baseURL: string | (() => string | Promise<string>),
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
    const resolvedBase = typeof baseURL === "function" ? await baseURL() : baseURL;
    const fullURL = new URL(resolvedBase.replace(/\/$/, "") + url);
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
      throw new HttpError(res.status, res.statusText, errorBody, { url: fullURL.toString(), method });
    }
    if (res.status === 204 || res.status === 205 || res.status === 304) {
      return null;
    }
    const text = await res.text();
    return text === "" ? null : JSON.parse(text);
  };

  const executor = createExecutor(transport, { plugins: options?.plugins, unwrap: options?.unwrap });
  return { execute: buildFetchChain(executor.execute, options?.retry, options?.timeout) };
}

/**
 * Thrown by {@link createFetchExecutor} when the server returns a non-2xx
 * status code. The Axios and ky executors also normalize their transport
 * errors to `HttpError`, so `onError` plugins and callers can branch on a
 * single error type regardless of the underlying transport. The original
 * transport error (e.g. an `AxiosError` or ky `HTTPError`) is preserved on
 * the `cause` property.
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
  public readonly url?: string;
  public readonly method?: string;

  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown = null,
    options?: { url?: string; method?: string; cause?: unknown },
  ) {
    super(`HTTP ${status}: ${statusText}`, { cause: options?.cause });
    this.name = "HttpError";
    this.url = options?.url;
    this.method = options?.method;
  }
}
