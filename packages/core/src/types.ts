import type { StandardSchemaV1 } from "./standard-schema.js";
import type { ValidationError } from "./utils/validate.js";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** Options passed to {@link Executor.execute} on every HTTP call. */
export interface ExecuteOptions {
  method: HttpMethod;
  url: string;
  params?: Record<string, unknown>;
  body?: unknown;
  /**
   * Per-request headers injected by a plugin's `onRequest` hook.
   * Headers cannot be set from `createApi` call sites directly — use middleware
   * to add dynamic headers such as `Authorization` or `X-Request-Id`.
   */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Per-call transport options, passed as the optional second argument to any
 * generated endpoint function: `api.create(params, { signal, headers, timeout })`.
 *
 * Passing a bare {@link AbortSignal} as the second argument is still supported
 * (backward compatible) — it is treated as `{ signal }`.
 *
 * @example
 * ```ts
 * await api.create({ body }, {
 *   signal: controller.signal,
 *   headers: { 'Idempotency-Key': key },
 *   timeout: 30_000,
 * });
 * ```
 */
export interface EndpointCallOptions {
  /** Aborts the request when the signal fires. */
  signal?: AbortSignal;
  /**
   * Per-call headers. Seeded onto the request before plugin `onRequest` hooks
   * run, and merged over the executor's default headers — so per-call headers
   * win over defaults. A plugin that sets the same header key still wins on
   * collision (plugins are cross-cutting policy such as auth).
   */
  headers?: Record<string, string>;
  /**
   * Per-call timeout in milliseconds. Aborts the request with a `TimeoutError`
   * when exceeded. Applied by the core client (transport-agnostic) and composes
   * with any executor-level timeout (whichever fires first wins).
   */
  timeout?: number;
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
 * Prefer {@link ExecutorPlugin} for most use cases. Use middleware only when
 * you need to span the full request/response lifecycle in a single closure
 * (e.g. duration measurement, per-request cleanup).
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
 * A named, composable unit of executor behavior.
 *
 * Each lifecycle hook is optional — implement only what you need.
 * Related concerns (e.g. auth header injection + 401 refresh) can be
 * bundled into a single plugin.
 *
 * @example Auth plugin
 * ```ts
 * const authPlugin: ExecutorPlugin = {
 *   name: 'auth',
 *   onRequest: async (opts) => ({
 *     ...opts,
 *     headers: { ...opts.headers, Authorization: `Bearer ${await getToken()}` },
 *   }),
 *   onError: async (err) => {
 *     if (isUnauthorized(err)) await refreshToken();
 *     throw err;
 *   },
 * };
 * ```
 */
export interface ExecutorPlugin {
  /** Optional name — used for introspection and `eject`. */
  name?: string;
  /** Runs before the request is sent. Return modified opts to transform the request. */
  onRequest?: (
    opts: ExecuteOptions,
  ) => ExecuteOptions | Promise<ExecuteOptions>;
  /** Runs after a successful response. Return a modified value to transform the response. */
  onResponse?: (
    response: unknown,
    opts: ExecuteOptions,
  ) => unknown | Promise<unknown>;
  /**
   * Runs when the request throws.
   *
   * The return value is ignored — this hook MUST always throw. To transform
   * the error, throw a new error from within the hook (the original error is
   * not automatically re-thrown for you).
   *
   * Transport errors reaching this hook are normalized to `HttpError` across
   * all executors (fetch, Axios, ky), so you can branch on `instanceof
   * HttpError` without depending on the underlying client.
   */
  onError?: (error: unknown, opts: ExecuteOptions) => never | Promise<never>;
}

/**
 * Options for {@link createExecutor}.
 *
 * @example
 * ```ts
 * const executor = createExecutor(transport, {
 *   plugins: [authPlugin, logger()],
 * });
 * ```
 */
export interface CreateExecutorOptions {
  /** Plugins applied in declaration order (first plugin is outermost). */
  plugins?: ExecutorPlugin[];
  /**
   * Transforms the raw response immediately after the transport returns,
   * before any plugin `onResponse` hooks and before schema validation in
   * `createApi`. Use to unwrap envelope shapes like `{ data: T }`.
   *
   * Equivalent to an innermost `onResponse` plugin, but declarative.
   *
   * @example
   * ```ts
   * const executor = createExecutor(transport, {
   *   unwrap: (raw) => (raw as { data: unknown })?.data ?? raw,
   * });
   * ```
   */
  unwrap?: (raw: unknown) => unknown;
}

/**
 * Any object with a `parse` method — compatible with Zod, Valibot, Yup, etc.
 *
 * @template TOutput Parsed output type.
 */
export interface Validator<TOutput> {
  parse(data: unknown): TOutput;
}

/**
 * A validator accepted by routar: either the `.parse()` duck-typed
 * {@link Validator} (Zod, Valibot, Yup, or any object with `.parse()`) **or** a
 * [Standard Schema](https://standardschema.dev) (`~standard` — Zod 3.24+,
 * Valibot, ArkType, …). Both forms are validated at runtime; the `.parse()` path
 * is preferred when present (synchronous), otherwise `~standard.validate` is
 * used (sync or async).
 *
 * @template TOutput Parsed/validated output type.
 */
export type AnyValidator<TOutput = unknown> =
  | Validator<TOutput>
  | StandardSchemaV1<unknown, TOutput>;

/**
 * Extracts the output type of an {@link AnyValidator} — the `.parse()` return
 * type for a {@link Validator}, or the Standard Schema output type. The
 * `Validator` branch is checked first so a schema satisfying both (e.g. Zod)
 * resolves through its `.parse()` signature.
 */
export type ValidatorOutput<T> = T extends Validator<infer O>
  ? O
  : T extends StandardSchemaV1<unknown, infer O>
    ? O
    : never;

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
  TResponse extends AnyValidator = AnyValidator,
  TAdapter extends
    | ((raw: ValidatorOutput<TResponse>) => unknown)
    | undefined = undefined,
> {
  method: HttpMethod;
  path: string;
  /** Validates and narrows request parameters before the HTTP call. */
  request?: AnyValidator<TRequest>;
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
  // Skip the internal `$router` property that createApi stamps on the client.
  [K in keyof TApi as K extends "$router" ? never : K]: TApi[K] extends (
    ...args: any[]
  ) => Promise<infer R>
    ? {
        request: Parameters<TApi[K]>[0];
        response: R;
      }
    : TApi[K] extends object
      ? ApiTypes<TApi[K]>
      : never;
};

/**
 * Per-kind validation mode.
 *
 * - `true` (default) — validate and throw {@link ValidationError} on failure.
 * - `false` — skip validation; raw data passes through untouched.
 * - `'warn'` — attempt validation but, on failure, pass the raw data through
 *   and report the error via {@link CreateApiOptions.onValidationError} instead
 *   of throwing. The drift-observation mode: surface schema drift without
 *   turning it into an outage.
 */
export type ValidationMode = boolean | "warn";

/**
 * Context passed to {@link CreateApiOptions.onValidationError} describing which
 * call and which phase produced the validation failure.
 */
export interface ValidationErrorContext {
  /** Which phase failed — request params or the server response. */
  kind: "request" | "response";
  /** The endpoint's HTTP method. */
  method: HttpMethod;
  /** The resolved request URL (path is already substituted). */
  url: string;
  /** The raw data that failed validation (raw params or raw response). */
  data: unknown;
}

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
 *
 * // Observe response drift without breaking production
 * createApi(executor, router, {
 *   validate: { request: true, response: 'warn' },
 *   onValidationError: (err, ctx) => Sentry.captureException(err, { extra: ctx }),
 * });
 * ```
 */
export interface CreateApiOptions {
  /**
   * Controls whether request and response schemas are run at call time.
   *
   * - `true` (default) — validate both request and response.
   * - `false` — skip both; raw params and raw response pass through.
   * - `'warn'` — validate both, but pass raw data through and report via
   *   {@link CreateApiOptions.onValidationError} instead of throwing.
   * - `{ request?, response? }` — set each independently (each a
   *   {@link ValidationMode}).
   */
  validate?: ValidationMode | { request?: ValidationMode; response?: ValidationMode };
  /**
   * Called when validation fails under `'warn'` mode (instead of throwing).
   * Use it to report schema drift to your observability stack. Never called
   * when `validate` is `true` (which throws) or `false` (which skips).
   */
  onValidationError?: (
    error: ValidationError,
    context: ValidationErrorContext,
  ) => void;
}
