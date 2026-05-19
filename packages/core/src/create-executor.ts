import type { Executor, ExecuteOptions, ExecutorMiddleware } from './types.js';

export function createExecutor(
  execute: (options: ExecuteOptions) => Promise<unknown>,
  middlewares: ExecutorMiddleware[] = [],
): Executor {
  const chain = middlewares.reduceRight<(options: ExecuteOptions) => Promise<unknown>>(
    (next, mw) => (opts) => mw(opts, next),
    execute,
  );
  return { execute: chain };
}
