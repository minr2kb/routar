import type { Executor, ExecutorMiddleware } from '@routar/core';
import { createExecutor } from '@routar/core';
import type { AxiosInstance } from 'axios';

type InstanceFactory = () => AxiosInstance | Promise<AxiosInstance>;

export type InstanceOrFactory = AxiosInstance | InstanceFactory;

function resolveInstance(input: InstanceOrFactory): AxiosInstance | Promise<AxiosInstance> {
  // AxiosInstance is callable but always has `interceptors`; plain factory functions do not.
  if ('interceptors' in (input as object)) {
    return input as AxiosInstance;
  }
  return (input as InstanceFactory)();
}

export function createAxiosExecutor(
  instanceOrFactory: InstanceOrFactory,
  options?: {
    middlewares?: ExecutorMiddleware[];
  },
): Executor {
  return createExecutor(async ({ method, url, params, body, headers, signal }) => {
    const instance = await resolveInstance(instanceOrFactory);
    const { data } = await instance.request({
      method,
      url,
      params,
      data: body,
      headers,
      signal,
    });
    return data;
  }, options?.middlewares);
}
