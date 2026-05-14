import { describe, expect, it, mock, afterEach } from 'bun:test';
import { createFetchExecutor, HttpError } from './create-fetch-executor.js';

// Mock global fetch
const originalFetch = globalThis.fetch;

function mockFetch(response: Partial<Response>) {
  globalThis.fetch = mock(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ mocked: true }),
    ...response,
  } as Response));
}

describe('createFetchExecutor', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('builds correct URL from baseURL + path', async () => {
    mockFetch({});
    const executor = createFetchExecutor('https://api.example.com');
    await executor.execute({ method: 'GET', url: '/todos' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.com/todos',
      expect.anything(),
    );
  });

  it('appends query params to URL', async () => {
    mockFetch({});
    const executor = createFetchExecutor('https://api.example.com');
    await executor.execute({ method: 'GET', url: '/todos', params: { page: '1' } });
    const calledUrl = (globalThis.fetch as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('page=1');
  });

  it('throws HttpError on non-2xx', async () => {
    mockFetch({ ok: false, status: 404, statusText: 'Not Found' });
    const executor = createFetchExecutor('https://api.example.com');
    await expect(executor.execute({ method: 'GET', url: '/todos' })).rejects.toBeInstanceOf(HttpError);
  });

  it('returns null for 204 responses', async () => {
    mockFetch({ ok: true, status: 204, headers: new Headers() });
    const executor = createFetchExecutor('https://api.example.com');
    const result = await executor.execute({ method: 'DELETE', url: '/todos/1' });
    expect(result).toBeNull();
  });

  it('does not set Content-Type for bodyless requests', async () => {
    mockFetch({});
    const executor = createFetchExecutor('https://api.example.com');
    await executor.execute({ method: 'GET', url: '/todos' });
    const opts = (globalThis.fetch as ReturnType<typeof mock>).mock.calls[0][1] as RequestInit;
    expect((opts.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('sets Content-Type for requests with body', async () => {
    mockFetch({});
    const executor = createFetchExecutor('https://api.example.com');
    await executor.execute({ method: 'POST', url: '/todos', body: { title: 'test' } });
    const opts = (globalThis.fetch as ReturnType<typeof mock>).mock.calls[0][1] as RequestInit;
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });
});
