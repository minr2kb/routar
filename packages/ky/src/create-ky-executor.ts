import type { Executor, ExecutorMiddleware } from "@routar/core";
import { createExecutor, serializeParams } from "@routar/core";
import type { KyInstance } from "ky";

/** Zero-argument factory that returns a ky instance (optionally async). */
type InstanceFactory = () => KyInstance | Promise<KyInstance>;

/**
 * Accepted input for {@link createKyExecutor}.
 *
 * Pass a pre-configured `KyInstance` for CSR (the same instance is reused
 * across requests, which preserves hooks and connection state).
 * Pass a factory function for SSR so a fresh instance — with per-request
 * headers or tokens — can be created on each call.
 */
export type InstanceOrFactory = KyInstance | InstanceFactory;

/**
 * Discriminates between a `KyInstance` and a plain factory function.
 *
 * `KyInstance` is itself callable, so `typeof input === 'function'` cannot
 * distinguish the two. Duck-typing via `extend` works because ky always
 * attaches it to instances, while user-supplied factories do not.
 */
function resolveInstance(
  input: InstanceOrFactory,
): KyInstance | Promise<KyInstance> {
  if ("extend" in (input as object) && typeof (input as KyInstance).extend === "function") {
    return input as KyInstance;
  }
  return (input as InstanceFactory)();
}

/**
 * Creates an {@link Executor} backed by ky.
 *
 * Suited for CSR where a single shared `KyInstance` is preferred (fast,
 * hook-friendly). Also supports SSR via a factory that produces a fresh
 * instance per request, allowing dynamic per-request auth headers.
 *
 * ky errors (`HTTPError`) propagate unchanged through the executor so you
 * can inspect `err.response` in middleware or callers.
 *
 * The `KyInstance` must have `prefixUrl` set — routar route paths (e.g.
 * `/todos`) have their leading `/` stripped before being passed to ky, which
 * requires relative paths when `prefixUrl` is configured.
 *
 * @param instanceOrFactory - A pre-built `KyInstance` (CSR) or a factory
 *   function that returns one (SSR / per-request config).
 * @param options.middlewares - Middleware chain applied before the ky call.
 *
 * @example
 * ```ts
 * // CSR — shared instance
 * const executor = createKyExecutor(ky.create({ prefixUrl: 'https://api.example.com' }));
 *
 * // SSR — factory
 * const executor = createKyExecutor(async () => {
 *   const token = await getServerToken();
 *   return ky.create({ prefixUrl: 'https://api.example.com', headers: { Authorization: `Bearer ${token}` } });
 * });
 * ```
 */
export function createKyExecutor(
  instanceOrFactory: InstanceOrFactory,
  options?: {
    middlewares?: ExecutorMiddleware[];
  },
): Executor {
  return createExecutor(
    async ({ method, url, params, body, headers, signal }) => {
      const instance = await resolveInstance(instanceOrFactory);
      const relativeUrl = url.replace(/^\//, "");
      const response = await instance(relativeUrl, {
        method,
        ...(params ? { searchParams: serializeParams(params) } : {}),
        ...(body != null ? { json: body } : {}),
        headers,
        signal,
      });
      if (response.status === 204 || response.status === 205) return null;
      const text = await response.text();
      return text === "" ? null : JSON.parse(text);
    },
    options?.middlewares,
  );
}
