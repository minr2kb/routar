import type {
  CreateExecutorOptions,
  ExecuteOptions,
  Executor,
  ExecutorMiddleware,
  ExecutorPlugin,
} from "./types.js";

function pluginToMiddleware(plugin: ExecutorPlugin): ExecutorMiddleware {
  return async (opts, next) => {
    const resolvedOpts = plugin.onRequest ? await plugin.onRequest(opts) : opts;
    try {
      const response = await next(resolvedOpts);
      return plugin.onResponse
        ? await plugin.onResponse(response, resolvedOpts)
        : response;
    } catch (err) {
      if (plugin.onError) return await plugin.onError(err, resolvedOpts);
      throw err;
    }
  };
}

function buildChain(
  execute: (options: ExecuteOptions) => Promise<unknown>,
  middlewares: ExecutorMiddleware[],
): (options: ExecuteOptions) => Promise<unknown> {
  return middlewares.reduceRight<(options: ExecuteOptions) => Promise<unknown>>(
    (next, mw) => (opts) => mw(opts, next),
    execute,
  );
}

/**
 * Creates an {@link Executor} by wrapping a transport function with plugins.
 *
 * Plugins run in declaration order (first plugin is outermost).
 *
 * For `retry` and `timeout`, use the options on {@link createFetchExecutor}
 * or configure them via the underlying HTTP client (axios, ky).
 *
 * @example
 * ```ts
 * const executor = createExecutor(transport, {
 *   plugins: [authPlugin, logger()],
 * });
 * ```
 */
export function createExecutor(
  execute: (options: ExecuteOptions) => Promise<unknown>,
  options: CreateExecutorOptions = {},
): Executor {
  const middlewares = (options.plugins ?? []).map(pluginToMiddleware);
  return { execute: buildChain(execute, middlewares) };
}

/**
 * Creates an {@link Executor} that selects the underlying transport at
 * request time based on the result of `resolver`.
 *
 * @example
 * ```ts
 * const apiExecutor = dispatchExecutor(() =>
 *   typeof window === 'undefined' ? serverExecutor : clientExecutor,
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
