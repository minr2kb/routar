export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** Options passed to {@link Executor.execute} on every HTTP call. */
export interface ExecuteOptions {
  method: HttpMethod;
  url: string;
  params?: Record<string, unknown>;
  body?: unknown;
  /**
   * Per-request headers injected by middleware (e.g. `defineMiddleware`).
   * Headers cannot be set from `createApi` call sites directly — use middleware
   * to add dynamic headers such as `Authorization` or `X-Request-Id`.
   */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Transport abstraction. Implement this to support any HTTP client.
 *
 * @see {@link createExecutor} to build an executor with middleware support.
 */
export interface Executor {
  execute(options: ExecuteOptions): Promise<unknown>;
}

/**
 * Middleware function for an {@link Executor}.
 *
 * Receives the current {@link ExecuteOptions} and a `next` function to call
 * the next middleware (or the underlying transport). Must return the response
 * promise.
 *
 * @example
 * ```ts
 * const myMiddleware: ExecutorMiddleware = async (opts, next) => {
 *   console.log(opts.method, opts.url);
 *   return next(opts);
 * };
 * ```
 */
export type ExecutorMiddleware = (
  options: ExecuteOptions,
  next: (options: ExecuteOptions) => Promise<unknown>,
) => Promise<unknown>;

/**
 * Any object with a `parse` method — compatible with Zod, Valibot, Yup, etc.
 *
 * @template TOutput Parsed output type.
 */
export interface Validator<TOutput> {
  parse(data: unknown): TOutput;
}

/** Extracts the output type of a {@link Validator}. */
export type ValidatorOutput<T extends Validator<unknown>> =
  T extends Validator<infer O> ? O : never;

/**
 * Shape of an endpoint's request parameters.
 *
 * All fields are optional at the type level; each endpoint declares only what
 * it actually uses via its `request` validator.
 */
export interface RequestShape {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
}

/**
 * Full specification of a single API endpoint.
 *
 * Prefer using the {@link endpoint} helper to define specs — it provides
 * contextual typing for `adapter` without requiring `any` casts.
 *
 * @template TRequest  Validated request shape.
 * @template TResponse Validator for the raw response.
 * @template TAdapter  Optional adapter function type.
 */
export interface EndpointSpec<
  TRequest extends RequestShape = RequestShape,
  TResponse extends Validator<unknown> = Validator<unknown>,
  TAdapter extends
    | ((raw: ValidatorOutput<TResponse>) => unknown)
    | undefined = undefined,
> {
  method: HttpMethod;
  path: string;
  /** Validates and narrows request parameters before the HTTP call. */
  request?: Validator<TRequest>;
  /** Validates the raw server response. */
  response: TResponse;
  /**
   * Transforms the validated response before returning to the caller.
   * When present, the endpoint's return type is the adapter's output type.
   */
  adapter?: TAdapter;
}

/**
 * Resolves the final return type of an endpoint call.
 *
 * - With `adapter`: returns the adapter's output type.
 * - Without `adapter`: returns `ValidatorOutput<TResponse>`.
 */
export type InferResponse<TSpec extends EndpointSpec<any, any, any>> =
  TSpec["adapter"] extends (raw: any) => infer R
    ? R
    : ValidatorOutput<TSpec["response"]>;

/**
 * A single entry inside a {@link RouterEndpoints} map.
 * Either a leaf endpoint spec or a nested {@link RouterDef}.
 */
export type RouterEntry = EndpointSpec<any, any, any> | RouterDef<any>;

/** A record of named {@link EndpointSpec}s or nested {@link RouterDef}s. */
export type RouterEndpoints = Record<string, RouterEntry>;

/** The return type of {@link defineRouter}. Passed directly to {@link createApi}. */
export interface RouterDef<
  TEndpoints extends RouterEndpoints = RouterEndpoints,
> {
  prefix: string;
  endpoints: TEndpoints;
}

/**
 * Extracts request/response types from a typed API client for use in query
 * hooks or mutation handlers. Supports nested router clients recursively.
 *
 * @example
 * ```ts
 * export type TodoApiTypes = ApiTypes<typeof todoApi>;
 * type CreateRequest = TodoApiTypes['create']['request'];
 * type CreateResponse = TodoApiTypes['create']['response'];
 *
 * // Nested router: api.users.todos.getList
 * type NestedTypes = ApiTypes<typeof api>;
 * type ListReq = NestedTypes['users']['todos']['getList']['request'];
 * ```
 */
export type ApiTypes<TApi> = {
  [K in keyof TApi]: TApi[K] extends (...args: any[]) => Promise<infer R>
    ? {
        request: Parameters<TApi[K]>[0];
        response: R;
      }
    : TApi[K] extends object
      ? ApiTypes<TApi[K]>
      : never;
};

/**
 * Options for {@link createApi}.
 *
 * @example
 * ```ts
 * // Disable all validation in production
 * createApi(executor, router, { validate: process.env.NODE_ENV !== 'production' });
 *
 * // Keep request validation (catch call-site bugs), skip response in prod
 * createApi(executor, router, { validate: { request: true, response: false } });
 * ```
 */
export interface CreateApiOptions {
  /**
   * Controls whether request and response schemas are run at call time.
   *
   * - `true` (default) — validate both request and response.
   * - `false` — skip both; raw params and raw response pass through.
   * - `{ request?, response? }` — enable/disable each independently.
   */
  validate?: boolean | { request?: boolean; response?: boolean };
}
