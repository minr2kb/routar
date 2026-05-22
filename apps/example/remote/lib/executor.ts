import { createAxiosExecutor } from '@routar/axios';
import { createFetchExecutor } from '@routar/fetch';
import axios from 'axios';

const BASE_URL = 'https://jsonplaceholder.typicode.com';

const axiosClient = axios.create({ baseURL: BASE_URL });

// Request interceptor — attach auth token from localStorage
axiosClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401 globally
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // e.g. redirect to login or refresh token
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// CSR executor — reuses the same axios instance (fast, interceptor-friendly)
export const clientExecutor = createAxiosExecutor(axiosClient);

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
