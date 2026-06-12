import { createAxiosExecutor } from "@routar/axios";
import { createFetchExecutor, dispatchExecutor, logger } from "@routar/core";
import axios from "axios";
import { JSONPLACEHOLDER_URL } from "../constants";

const axiosClient = axios.create({ baseURL: JSONPLACEHOLDER_URL });

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

const clientExecutor = createAxiosExecutor(axiosClient, {
  plugins: [logger({ log: (msg, data) => console.log(`[csr] ${msg}`, data) })],
});

const fetchExecutor = createFetchExecutor(JSONPLACEHOLDER_URL, {
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
  plugins: [logger({ log: (msg, data) => console.log(`[ssr] ${msg}`, data) })],
});

// Single executor for the external API — picks transport at request time:
// axios (with interceptors) on the client, fetch (with cookies) on the server.
export const apiExecutor = dispatchExecutor(() =>
  typeof window === "undefined" ? fetchExecutor : clientExecutor,
);
