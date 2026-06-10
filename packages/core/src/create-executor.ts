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
      if (plugin.onError) {
        await plugin.onError(err, resolvedOpts);
        throw err;
      }
      throw err;
    }
  };
}

export function buildChain(
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
 *
 * @example Unwrap an envelope response
 * ```ts
 * const executor = createExecutor(transport, {
 *   unwrap: (raw) => (raw as { data: unknown })?.data ?? raw,
 * });
 * ```
 */
export function createExecutor(
  execute: (options: ExecuteOptions) => Promise<unknown>,
  options: CreateExecutorOptions = {},
): Executor {
  const plugins = [...(options.plugins ?? [])];
  // `unwrap` becomes the innermost `onResponse` hook: appended last so it runs
  // first on the response (immediately after the transport, before user plugins).
  if (options.unwrap) {
    const unwrapFn = options.unwrap;
    plugins.push({ onResponse: (raw) => unwrapFn(raw) });
  }
  const middlewares = plugins.map(pluginToMiddleware);
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
