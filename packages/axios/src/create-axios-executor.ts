import type { CreateExecutorOptions, Executor } from "@routar/core";
import { createExecutor, HttpError } from "@routar/core";
import type { AxiosInstance } from "axios";
import { isAxiosError } from "axios";

/** Zero-argument factory that returns an Axios instance (optionally async). */
type InstanceFactory = () => AxiosInstance | Promise<AxiosInstance>;

/**
 * Accepted input for {@link createAxiosExecutor}.
 *
 * Pass a pre-configured `AxiosInstance` for CSR (the same instance is reused
 * across requests, which preserves interceptors and connection pooling).
 * Pass a factory function for SSR so a fresh instance — with per-request
 * headers or tokens — can be created on each call.
 */
export type InstanceOrFactory = AxiosInstance | InstanceFactory;

/**
 * Discriminates between an `AxiosInstance` and a plain factory function.
 *
 * `AxiosInstance` is itself callable, so `typeof input === 'function'` cannot
 * distinguish the two. Duck-typing via `interceptors` works because Axios
 * always attaches it to instances, while user-supplied factories do not.
 */
function resolveInstance(
  input: InstanceOrFactory,
): AxiosInstance | Promise<AxiosInstance> {
  // AxiosInstance is callable but always has `interceptors` and a `request` method;
  // plain factory functions have neither.
  if ("interceptors" in (input as object) && typeof (input as any).request === "function") {
    return input as AxiosInstance;
  }
  return (input as InstanceFactory)();
}

/**
 * Creates an {@link Executor} backed by Axios.
 *
 * Suited for CSR where a single shared `AxiosInstance` is preferred (fast,
 * interceptor-friendly). Also supports SSR via a factory that produces a
 * fresh instance per request, allowing dynamic per-request auth headers.
 *
 * Transport errors are normalized: an `AxiosError` carrying a response is
 * re-thrown as an {@link HttpError} (with `status`, `statusText`, and `body`
 * populated from the response, and the original `AxiosError` preserved on
 * `cause`). This keeps `onError` plugins and callers transport-agnostic — they
 * can branch on `instanceof HttpError` regardless of the underlying client.
 * Errors without a response (network failures, request cancellations) are
 * re-thrown unchanged so you can still inspect `err.code`. Use `withRetry`'s
 * `shouldRetry` option to skip retries on 4xx.
 *
 * @param instanceOrFactory - A pre-built `AxiosInstance` (CSR) or a factory
 *   function that returns one (SSR / per-request config).
 * @param options.middlewares - Middleware chain applied before the Axios call.
 *
 * @example
 * ```ts
 * // CSR — shared instance
 * const executor = createAxiosExecutor(axios.create({ baseURL: 'https://api.example.com' }));
 *
 * // SSR — factory
 * const executor = createAxiosExecutor(async () => {
 *   const token = await getServerToken();
 *   return axios.create({ baseURL: 'https://api.example.com', headers: { Authorization: `Bearer ${token}` } });
 * });
 * ```
 */
export function createAxiosExecutor(
  instanceOrFactory: InstanceOrFactory,
  options?: CreateExecutorOptions,
): Executor {
  return createExecutor(
    async ({ method, url, params, body, headers, signal }) => {
      const instance = await resolveInstance(instanceOrFactory);
      const base = (instance.defaults.baseURL ?? "").replace(/\/$/, "");
      try {
        const { data } = await instance.request({
          method,
          url: base + url,
          baseURL: "",
          params,
          data: body,
          headers,
          signal,
        });
        return data;
      } catch (err) {
        if (isAxiosError(err) && err.response) {
          throw new HttpError(
            err.response.status,
            err.response.statusText ?? String(err.response.status),
            err.response.data,
            err,
          );
        }
        throw err;
      }
    },
    options,
  );
}
