import { describe, expect, it, mock, spyOn } from 'bun:test';
import { createExecutor } from './create-executor.js';
import { withLogger, withRetry, withTimeout } from './middleware.js';
import type { ExecuteOptions } from './types.js';

const opts: ExecuteOptions = { method: 'GET', url: '/test' };

describe('withRetry', () => {
  it('succeeds on first attempt, calls execute once', async () => {
    const execute = mock(async () => 'ok');
    const executor = createExecutor(execute, [withRetry(3)]);
    await executor.execute(opts);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    let calls = 0;
    const execute = mock(async () => {
      if (++calls < 3) throw new Error('transient');
      return 'ok';
    });
    const executor = createExecutor(execute, [withRetry(3)]);
    const result = await executor.execute(opts);
    expect(result).toBe('ok');
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all retries', async () => {
    const execute = mock(async () => { throw new Error('always fails'); });
    const executor = createExecutor(execute, [withRetry(2)]);
    await expect(executor.execute(opts)).rejects.toThrow('always fails');
    expect(execute).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('stops retrying when shouldRetry returns false', async () => {
    const execute = mock(async () => { throw new Error('skip retry'); });
    const executor = createExecutor(execute, [withRetry(3, { shouldRetry: () => false })]);
    await expect(executor.execute(opts)).rejects.toThrow('skip retry');
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('passes attempt index to shouldRetry', async () => {
    const seen: number[] = [];
    const execute = mock(async () => { throw new Error('fail'); });
    const executor = createExecutor(execute, [
      withRetry(2, { shouldRetry: (_, attempt) => { seen.push(attempt); return true; } }),
    ]);
    await expect(executor.execute(opts)).rejects.toThrow();
    expect(seen).toEqual([0, 1]);
  });
});

describe('withTimeout', () => {
  it('resolves normally when request completes within timeout', async () => {
    const execute = mock(async () => 'ok');
    const executor = createExecutor(execute, [withTimeout(1000)]);
    await expect(executor.execute(opts)).resolves.toBe('ok');
  });

  it('aborts when request exceeds timeout', async () => {
    const execute = (o: ExecuteOptions) =>
      new Promise((_, reject) => {
        const t = setTimeout(() => reject(new Error('should not reach')), 500);
        o.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new DOMException('AbortError', 'AbortError'));
        });
      });
    const executor = createExecutor(execute, [withTimeout(10)]);
    await expect(executor.execute(opts)).rejects.toThrow();
  });

  it('merges with existing signal — aborts when either fires first', async () => {
    const execute = mock(async (_o: ExecuteOptions) => 'ok');
    const executor = createExecutor(execute, [withTimeout(1000)]);
    const signal = AbortSignal.abort();
    await executor.execute({ ...opts, signal });
    expect(execute.mock.calls[0][0].signal?.aborted).toBe(true);
  });
});

describe('withLogger', () => {
  it('logs request and success', async () => {
    const log = mock((_msg: string, _data?: unknown) => {});
    const executor = createExecutor(async () => 'ok', [withLogger({ log })]);
    await executor.execute({ method: 'POST', url: '/items' });
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0][0]).toContain('POST /items');
    expect(log.mock.calls[1][0]).toContain('POST /items');
  });

  it('logs request and error, then rethrows', async () => {
    const log = mock((_msg: string, _data?: unknown) => {});
    const executor = createExecutor(
      async () => { throw new Error('oops'); },
      [withLogger({ log })],
    );
    await expect(executor.execute({ method: 'GET', url: '/fail' })).rejects.toThrow('oops');
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[1][0]).toContain('error');
  });

  it('defaults to console.log', async () => {
    const spy = spyOn(console, 'log').mockImplementation(() => {});
    const executor = createExecutor(async () => 'ok', [withLogger()]);
    await executor.execute(opts);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
