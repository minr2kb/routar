import type { ExecuteOptions, ExecutorMiddleware, ExecutorPlugin } from "./types.js";

/**
 * Thrown by the built-in `timeout` option when a request exceeds the
 * configured duration. Distinguishable from a user-initiated
 * {@link AbortSignal} cancellation.
 */
export class TimeoutError extends Error {
  constructor(public readonly ms: number) {
    super(`Request timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Identity helper that returns the plugin as-is, providing full type inference.
 *
 * @example
 * ```ts
 * const authPlugin = definePlugin({
 *   name: 'auth',
 *   onRequest: async (opts) => ({
 *     ...opts,
 *     headers: { ...opts.headers, Authorization: `Bearer ${await getToken()}` },
 *   }),
 * });
 * ```
 */
export function definePlugin(plugin: ExecutorPlugin): ExecutorPlugin {
  return plugin;
}

/**
 * Logs each request and its outcome (success duration or error).
 *
 * @param options.log - Custom logging function. Defaults to `console.log`.
 *
 * @example
 * ```ts
 * createExecutor(transport, {
 *   plugins: [logger({ log: (msg, data) => myLogger.debug(msg, data) })],
 * })
 * ```
 */
export function logger(options?: {
  log?: (message: string, data?: unknown) => void;
}): ExecutorPlugin {
  const log = options?.log ?? ((msg, data) => console.log(msg, data));
  const timings = new WeakMap<ExecuteOptions, number>();
  return definePlugin({
    name: "logger",
    onRequest: (opts) => {
      timings.set(opts, Date.now());
      log(`[routar] ${opts.method} ${opts.url}`, {
        params: opts.params,
        body: opts.body,
      });
      return opts;
    },
    onResponse: (res, opts) => {
      log(
        `[routar] ${opts.method} ${opts.url} — ${Date.now() - (timings.get(opts) ?? Date.now())}ms`,
      );
      timings.delete(opts);
      return res;
    },
    onError: (err, opts) => {
      log(
        `[routar] ${opts.method} ${opts.url} — error after ${Date.now() - (timings.get(opts) ?? Date.now())}ms`,
        err,
      );
      timings.delete(opts);
      throw err as never;
    },
  });
}

export function withRetry(
  count: number,
  options?: { shouldRetry?: (error: unknown, attempt: number) => boolean },
): ExecutorMiddleware {
  return async (opts, next) => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= count; attempt++) {
      try {
        return await next(opts);
      } catch (err) {
        lastError = err;
        if (attempt === count) break;
        if (options?.shouldRetry && !options.shouldRetry(err, attempt)) break;
      }
    }
    throw lastError;
  };
}

export function withTimeout(ms: number): ExecutorMiddleware {
  return async (opts, next) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new TimeoutError(ms)), ms);

    const { signal, cleanup } = opts.signal
      ? anySignal([opts.signal, controller.signal])
      : { signal: controller.signal, cleanup: () => {} };

    try {
      return await next({ ...opts, signal });
    } finally {
      clearTimeout(timer);
      cleanup();
    }
  };
}

function anySignal(signals: AbortSignal[]): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  const attached: AbortSignal[] = [];
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener("abort", onAbort, { once: true });
    attached.push(s);
  }
  return {
    signal: controller.signal,
    cleanup: () =>
      attached.forEach((s) => {
        s.removeEventListener("abort", onAbort);
      }),
  };
}
