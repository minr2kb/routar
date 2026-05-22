import type { ExecuteOptions, Executor, ExecutorMiddleware } from "./types.js";

/**
 * Creates an {@link Executor} by wrapping a transport function with an
 * optional middleware chain.
 *
 * Middlewares are applied in declaration order — the first middleware is the
 * outermost wrapper and runs first on each request.
 *
 * @param execute - The underlying transport function (fetch, axios, etc.).
 * @param middlewares - Ordered list of middlewares to apply.
 *
 * @example
 * ```ts
 * const executor = createExecutor(
 *   async ({ method, url, body }) => {
 *     const res = await fetch(url, { method, body: JSON.stringify(body) });
 *     return res.json();
 *   },
 *   [withTimeout(5000), withRetry(3), withLogger()],
 * );
 * ```
 */
export function createExecutor(
  execute: (options: ExecuteOptions) => Promise<unknown>,
  middlewares: ExecutorMiddleware[] = [],
): Executor {
  const chain = middlewares.reduceRight<
    (options: ExecuteOptions) => Promise<unknown>
  >((next, mw) => (opts) => mw(opts, next), execute);
  return { execute: chain };
}
