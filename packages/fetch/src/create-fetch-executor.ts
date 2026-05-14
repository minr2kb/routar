import type { Executor, ExecuteOptions } from '@routar/core';
import { serializeParams } from '@routar/core';

export function createFetchExecutor(
  baseURL: string,
  options?: {
    defaultHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  },
): Executor {
  return {
    execute: async ({ method, url, params, body, headers, signal }: ExecuteOptions) => {
      const fullURL = new URL(url, baseURL);
      if (params) {
        serializeParams(params).forEach((v, k) => fullURL.searchParams.set(k, v));
      }

      const defaultHeaders = (await options?.defaultHeaders?.()) ?? {};

      const res = await fetch(fullURL.toString(), {
        method,
        headers: {
          ...(body != null ? { 'Content-Type': 'application/json' } : {}),
          ...defaultHeaders,
          ...headers,
        },
        body: body != null ? JSON.stringify(body) : undefined,
        signal,
      });

      if (!res.ok) {
        throw new HttpError(res.status, res.statusText);
      }
      if (res.status === 204 || res.headers.get('content-length') === '0') {
        return null;
      }
      return res.json();
    },
  };
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }
}
