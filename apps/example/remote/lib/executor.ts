import { createAxiosExecutor } from '@routar/axios';
import { createFetchExecutor } from '@routar/fetch';
import axios from 'axios';

const BASE_URL = 'https://jsonplaceholder.typicode.com';

// CSR executor — reuses the same axios instance (fast, interceptor-friendly)
export const clientExecutor = createAxiosExecutor(axios.create({ baseURL: BASE_URL }));

// SSR executor — fetch with per-request dynamic auth headers
export const fetchExecutor = createFetchExecutor(BASE_URL, {
  defaultHeaders: async () => {
    try {
      const { cookies } = await import('next/headers');
      const token = (await cookies()).get('access_token')?.value;
      return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
    } catch {
      // Not in Next.js server context (e.g. during build)
      return {};
    }
  },
});
