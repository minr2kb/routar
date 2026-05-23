import { createAxiosExecutor } from "@routar/axios";
import { createExecutor, dispatchExecutor, withLogger } from "@routar/core";
import { createFetchExecutor } from "@routar/fetch";
import axios from "axios";

const BASE_URL = "https://jsonplaceholder.typicode.com";
const LOCAL_API_BASE = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api`;

const axiosClient = axios.create({ baseURL: BASE_URL });

// dispatchExecutor guarantees browser context here — no typeof window guard needed
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

const _clientExecutor = createAxiosExecutor(axiosClient, {
  middlewares: [
    withLogger({
      log: (msg, data) => console.log(`[csr] ${msg}`, data),
    }),
  ],
});
const _fetchExecutor = createFetchExecutor(BASE_URL, {
  defaultHeaders: async () => {
    try {
      const { cookies } = await import("next/headers");
      const token = (await cookies()).get("access_token")?.value;
      return token
        ? { Authorization: `Bearer ${token}` }
        : ({} as Record<string, string>);
    } catch {
      return {};
    }
  },
  middlewares: [
    withLogger({
      log: (msg, data) => console.log(`[ssr] ${msg}`, data),
    }),
  ],
});

// Single executor for external API — picks transport at request time
export const apiExecutor = dispatchExecutor(() =>
  typeof window === "undefined" ? _fetchExecutor : _clientExecutor,
);

// Local executor — fetch with absolute URL works in both SSR and CSR
// withLogger lets you verify SSR prefetch via terminal logs
const _localFetch = createFetchExecutor(LOCAL_API_BASE);
export const localExecutor = createExecutor(
  (opts) => _localFetch.execute(opts),
  [
    withLogger({
      log: (msg, data) => console.log(`[localExecutor] ${msg}`, data),
    }),
  ],
);
