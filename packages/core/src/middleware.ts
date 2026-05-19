import type { ExecutorMiddleware } from './types.js';

/**
 * Identity helper that returns the middleware as-is.
 *
 * Wrap your middleware function with this to get full type inference on `opts`
 * and `next` without having to annotate the type manually.
 *
 * @example
 * ```ts
 * const withCorrelationId = defineMiddleware((opts, next) =>
 *   next({ ...opts, headers: { ...opts.headers, 'X-Request-Id': crypto.randomUUID() } })
 * );
 * ```
 */
export function defineMiddleware(fn: ExecutorMiddleware): ExecutorMiddleware {
  return fn;
}

/**
 * Retries a failed request up to `count` additional times.
 *
 * By default all errors trigger a retry. Pass `shouldRetry` to skip retries
 * for non-transient errors (e.g. 4xx responses).
 *
 * @param count - Number of retries (not counting the initial attempt).
 * @param options.shouldRetry - Return `false` to stop retrying early.
 *
 * @example
 * ```ts
 * withRetry(3, {
 *   shouldRetry: (err) => err instanceof HttpError && err.status >= 500,
 * })
 * ```
 */
export function withRetry(
  count: number,
  options?: { shouldRetry?: (error: unknown, attempt: number) => boolean },
): ExecutorMiddleware {
  return defineMiddleware(async (opts, next) => {
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
  });
}

/**
 * Aborts a request if it does not complete within `ms` milliseconds.
 *
 * Merges the timeout signal with any existing `AbortSignal` on the request,
 * so whichever fires first wins.
 *
 * @param ms - Timeout in milliseconds.
 */
export function withTimeout(ms: number): ExecutorMiddleware {
  return defineMiddleware(async (opts, next) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);

    const signal = opts.signal
      ? anySignal([opts.signal, controller.signal])
      : controller.signal;

    try {
      return await next({ ...opts, signal });
    } finally {
      clearTimeout(timer);
    }
  });
}

/**
 * Logs each request and its outcome (success duration or error).
 *
 * @param options.log - Custom logging function. Defaults to `console.log`.
 *
 * @example
 * ```ts
 * withLogger({ log: (msg, data) => logger.debug(msg, data) })
 * ```
 */
export function withLogger(options?: {
  log?: (message: string, data?: unknown) => void;
}): ExecutorMiddleware {
  const log = options?.log ?? ((msg, data) => console.log(msg, data));
  return defineMiddleware(async (opts, next) => {
    const start = Date.now();
    log(`[routar] ${opts.method} ${opts.url}`, { params: opts.params, body: opts.body });
    try {
      const result = await next(opts);
      log(`[routar] ${opts.method} ${opts.url} — ${Date.now() - start}ms`);
      return result;
    } catch (err) {
      log(`[routar] ${opts.method} ${opts.url} — error after ${Date.now() - start}ms`, err);
      throw err;
    }
  });
}

/** Combines multiple AbortSignals into one that aborts when any of them fire. */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}
