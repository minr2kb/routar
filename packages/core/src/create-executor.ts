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

/**
 * Creates an {@link Executor} that selects the underlying transport at
 * request time based on the result of `resolver`.
 *
 * Use this to unify SSR and CSR behind a single API client — the resolver
 * picks the right executor per request, so `createApi` is called once and
 * works in both environments without duplicate `*ServerApi` instances.
 *
 * The resolver receives the full {@link ExecuteOptions} so it can branch on
 * environment, URL prefix, auth context, or any runtime condition.
 *
 * @param resolver - Called on every request; returns the executor to delegate to.
 *
 * @example
 * ```ts
 * // SSR vs CSR — pick transport based on environment
 * const apiExecutor = dispatchExecutor(() =>
 *   typeof window === 'undefined' ? serverExecutor : clientExecutor,
 * );
 *
 * // Route by URL prefix — internal routes use a different transport
 * const apiExecutor = dispatchExecutor((opts) =>
 *   opts.url.startsWith('/internal') ? internalExecutor : publicExecutor,
 * );
 * ```
 */
export function dispatchExecutor(
  resolver: (opts: ExecuteOptions) => Executor,
): Executor {
  return {
    execute: (opts) => resolver(opts).execute(opts),
  };
}
