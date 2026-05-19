export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Options passed to {@link Executor.execute} on every HTTP call. */
export interface ExecuteOptions {
  method: HttpMethod;
  url: string;
  params?: Record<string, unknown>;
  body?: unknown;
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
  path?:  Record<string, unknown>;
  query?: Record<string, unknown>;
  body?:  unknown;
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
  TRequest extends RequestShape        = RequestShape,
  TResponse extends Validator<unknown> = Validator<unknown>,
  TAdapter extends
    | ((raw: ValidatorOutput<TResponse>) => unknown)
    | undefined                        = undefined,
> {
  method:   HttpMethod;
  path:     string;
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
  TSpec['adapter'] extends (raw: any) => infer R
    ? R
    : ValidatorOutput<TSpec['response']>;

/** A record of named {@link EndpointSpec}s, used as the value type in {@link RouterDef}. */
export type RouterEndpoints = Record<string, EndpointSpec<any, any, any>>;

/** The return type of {@link defineRouter}. Passed directly to {@link createApi}. */
export interface RouterDef<TEndpoints extends RouterEndpoints = RouterEndpoints> {
  prefix:    string;
  endpoints: TEndpoints;
}

/**
 * Extracts request/response types from a typed API client for use in query
 * hooks or mutation handlers.
 *
 * @example
 * ```ts
 * export type TodoApiTypes = ApiTypes<typeof todoApi>;
 * type CreateRequest = TodoApiTypes['create']['request'];
 * type CreateResponse = TodoApiTypes['create']['response'];
 * ```
 */
export type ApiTypes<TApi> = {
  [K in keyof TApi]: TApi[K] extends (...args: any[]) => Promise<infer R>
    ? {
        request:  Parameters<TApi[K]>[0];
        response: R;
      }
    : never;
};
