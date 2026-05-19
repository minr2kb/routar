import type { ExecutorMiddleware } from './types.js';

export function defineMiddleware(fn: ExecutorMiddleware): ExecutorMiddleware {
  return fn;
}

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
