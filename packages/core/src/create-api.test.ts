import { describe, expect, it, mock } from 'bun:test';
import { createApi, defineRouter, ValidationError } from './index.js';

// Simple mock validator
const makeValidator = <T>(value: T) => ({
  parse: (data: unknown) => data as T,
});

const failValidator = {
  parse: (_: unknown): never => {
    throw new Error('parse failed');
  },
};

// Mock executor
const mockExecutor = (response: unknown) => ({
  execute: mock(async () => response),
});

describe('createApi', () => {
  describe('with RouterDef', () => {
    it('calls executor with correct method and url', async () => {
      const executor = mockExecutor({ id: 1 });
      const router = defineRouter('/todos', {
        getDetail: {
          method: 'GET' as const,
          path: '/:id',
          response: makeValidator({ id: 1 }),
        },
      });
      const api = createApi(executor, router);
      await api.getDetail({ path: { id: 1 } });
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET', url: '/todos/1' }),
      );
    });
  });

  describe('inline form', () => {
    it('works with prefix + endpoints', async () => {
      const executor = mockExecutor([]);
      const api = createApi(executor, '/items', {
        list: { method: 'GET' as const, path: '/', response: makeValidator([]) },
      });
      await api.list({});
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/items' }),
      );
    });

    it('works without prefix', async () => {
      const executor = mockExecutor({});
      const api = createApi(executor, {
        ping: { method: 'GET' as const, path: '/ping', response: makeValidator({}) },
      });
      await api.ping();
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/ping' }),
      );
    });
  });

  it('passes query params to executor', async () => {
    const executor = mockExecutor([]);
    const api = createApi(executor, '/todos', {
      list: { method: 'GET' as const, path: '/', response: makeValidator([]) },
    });
    await api.list({ query: { page: 1, limit: 10 } });
    expect(executor.execute).toHaveBeenCalledWith(
      expect.objectContaining({ params: { page: 1, limit: 10 } }),
    );
  });

  it('passes body to executor', async () => {
    const executor = mockExecutor({ id: 1 });
    const api = createApi(executor, '/todos', {
      create: { method: 'POST' as const, path: '/', response: makeValidator({ id: 1 }) },
    });
    await api.create({ body: { title: 'test' } });
    expect(executor.execute).toHaveBeenCalledWith(
      expect.objectContaining({ body: { title: 'test' } }),
    );
  });

  it('applies adapter to response', async () => {
    const executor = mockExecutor({ created_time: '2024-01-01' });
    const api = createApi(executor, '/todos', {
      get: {
        method: 'GET' as const,
        path: '/:id',
        response: makeValidator({ created_time: '2024-01-01' }),
        adapter: (raw: { created_time: string }) => ({ createdAt: new Date(raw.created_time) }),
      },
    });
    const result = await api.get({ path: { id: 1 } });
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('throws ValidationError on response parse failure', async () => {
    const executor = mockExecutor({ bad: 'data' });
    const api = createApi(executor, '/todos', {
      get: { method: 'GET' as const, path: '/', response: failValidator },
    });
    await expect(api.get()).rejects.toBeInstanceOf(ValidationError);
  });

  it('passes signal to executor', async () => {
    const executor = mockExecutor({});
    const api = createApi(executor, {
      ping: { method: 'GET' as const, path: '/ping', response: makeValidator({}) },
    });
    const signal = AbortSignal.abort();
    await api.ping({}, signal);
    expect(executor.execute).toHaveBeenCalledWith(
      expect.objectContaining({ signal }),
    );
  });
});
