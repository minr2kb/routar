import type { Executor, ExecuteOptions } from '@routar/core';
import type { AxiosInstance } from 'axios';

type InstanceFactory = () => AxiosInstance | Promise<AxiosInstance>;

export function createAxiosExecutor(factory: InstanceFactory): Executor {
  return {
    execute: async ({ method, url, params, body, headers, signal }: ExecuteOptions) => {
      const instance = await factory();
      const { data } = await instance.request({
        method,
        url,
        params,
        data: body,
        headers,
        signal,
      });
      return data;
    },
  };
}
