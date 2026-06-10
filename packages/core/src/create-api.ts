import { isRouterDef } from "./define-router.js";
import { TimeoutError } from "./middleware.js";
import type { StandardSchemaV1 } from "./standard-schema.js";
import type {
  CreateApiOptions,
  EndpointCallOptions,
  EndpointSpec,
  ExecuteOptions,
  Executor,
  InferResponse,
  RequestShape,
  RouterDef,
  RouterEndpoints,
  Validator,
  ValidatorOutput,
} from "./types.js";
import { joinPaths, resolvePath } from "./utils/path.js";
import { runValidator } from "./utils/run-validator.js";
import { ValidationError } from "./utils/validate.js";

/** Callable type for a single endpoint on the generated API client. */
type EndpointFn<TSpec extends EndpointSpec<any, any, any>> =
  TSpec["request"] extends Validator<infer R>
    ? (
        params: R,
        options?: AbortSignal | EndpointCallOptions,
      ) => Promise<InferResponse<TSpec>>
    : TSpec["request"] extends StandardSchemaV1<unknown, infer O>
      ? (
          params: O,
          options?: AbortSignal | EndpointCallOptions,
        ) => Promise<InferResponse<TSpec>>
      : (
          params?: RequestShape,
          options?: AbortSignal | EndpointCallOptions,
        ) => Promise<InferResponse<TSpec>>;

/**
 * Fully-typed API client produced by {@link createApi}.
 * Nested {@link RouterDef} entries become nested sub-client objects.
 */
export type ApiClient<TEndpoints extends RouterEndpoints> = {
  [K in keyof TEndpoints]: TEndpoints[K] extends RouterDef<
    infer TNestedEndpoints
  >
    ? ApiClient<TNestedEndpoints>
    : TEndpoints[K] extends EndpointSpec<any, any, any>
      ? EndpointFn<TEndpoints[K]>
      : never;
};

/**
 * An {@link ApiClient} that also carries its source {@link RouterDef} on the
 * `$router` property. This is the actual return type of {@link createApi};
 * downstream tools (e.g. `@routar/react-query`) recover the router (prefix +
 * endpoint methods) from it without it being re-passed. `$router` is
 * non-enumerable and excluded from {@link ApiTypes}; the `$` prefix keeps it
 * from colliding with endpoint names.
 */
export type ApiClientWithRouter<TEndpoints extends RouterEndpoints> =
  ApiClient<TEndpoints> & { readonly $router: RouterDef<TEndpoints> };

/**
 * Builds a fully-typed API client from an {@link Executor} and a router
 * (or bare endpoint map).
 *
 * Three call signatures are supported:
 * - `createApi(executor, router)` — preferred; pass the result of {@link defineRouter}.
 * - `createApi(executor, prefix, endpoints)` — inline router without {@link defineRouter}.
 * - `createApi(executor, endpoints)` — no prefix; useful for flat endpoint maps.
 *
 * Each key in `endpoints` becomes a typed async function on the returned client.
 * The function validates the request with `spec.request.parse` (if present),
 * resolves path parameters, calls the executor, validates the response with
 * `spec.response.parse`, and applies `spec.adapter` (if present).
 *
 * @param executor - Transport to use for every HTTP call.
 * @param router - A {@link RouterDef} produced by {@link defineRouter}.
 * @param options - Optional settings (e.g. `validate` to skip schema parsing in production).
 *
 * @example Basic usage
 * ```ts
 * const todoApi = createApi(executor, todoRouter);
 * const todos = await todoApi.getList({});
 * const todo  = await todoApi.getDetail({ path: { id: 1 } });
 * const next  = await todoApi.create({ body: { title: 'buy milk' } });
 * ```
 *
 * @example Nested router — access via dot notation
 * ```ts
 * const api = createApi(executor, apiRouter); // apiRouter has users → todos nesting
 * await api.users.getList({});
 * await api.users.todos.getList({});
 * ```
 *
 * @example Cancel in-flight requests with AbortSignal
 * ```ts
 * const controller = new AbortController();
 * const todos = await todoApi.getList({}, controller.signal);
 * controller.abort();
 * ```
 *
 * @example Extract types from the client — no duplication
 * ```ts
 * import type { ApiTypes } from '@routar/core';
 * type TodoApiTypes  = ApiTypes<typeof todoApi>;
 * type Todo          = TodoApiTypes['getDetail']['response'];
 * type CreateRequest = TodoApiTypes['create']['request'];
 * ```
 *
 * @example Skip response validation in production
 * ```ts
 * const prodApi = createApi(executor, todoRouter, {
 *   validate: { request: true, response: process.env.NODE_ENV !== 'production' },
 * });
 * ```
 */
export function createApi<TEndpoints extends RouterEndpoints>(
  executor: Executor,
  router: RouterDef<TEndpoints>,
  options?: CreateApiOptions,
): ApiClientWithRouter<TEndpoints>;

/**
 * @param executor - Transport to use for every HTTP call.
 * @param prefix - URL prefix prepended to every endpoint path.
 * @param endpoints - Record of named endpoint specs.
 * @param options - Optional settings.
 */
export function createApi<TEndpoints extends RouterEndpoints>(
  executor: Executor,
  prefix: string,
  endpoints: TEndpoints,
  options?: CreateApiOptions,
): ApiClientWithRouter<TEndpoints>;

/**
 * @param executor - Transport to use for every HTTP call.
 * @param endpoints - Record of named endpoint specs (no URL prefix).
 * @param options - Optional settings.
 */
export function createApi<TEndpoints extends RouterEndpoints>(
  executor: Executor,
  endpoints: TEndpoints,
  options?: CreateApiOptions,
): ApiClientWithRouter<TEndpoints>;

export function createApi(
  executor: Executor,
  routerOrPrefixOrEndpoints:
    | RouterDef<RouterEndpoints>
    | RouterEndpoints
    | string,
  endpointsArgOrOptions?: RouterEndpoints | CreateApiOptions,
  optionsArg?: CreateApiOptions,
): Record<string, unknown> {
  const { prefix, endpoints, options } = resolveArgs(
    routerOrPrefixOrEndpoints,
    endpointsArgOrOptions,
    optionsArg,
  );
  const client = buildClient(executor, prefix, endpoints, options);
  // Stash the source router so downstream tools (e.g. @routar/react-query)
  // recover prefix + endpoint methods without it being re-passed.
  Object.defineProperty(client, "$router", {
    value: { prefix, endpoints } satisfies RouterDef<RouterEndpoints>,
    enumerable: false,
  });
  return client;
}

function resolveArgs(
  second: RouterDef<RouterEndpoints> | RouterEndpoints | string,
  third: RouterEndpoints | CreateApiOptions | undefined,
  fourth: CreateApiOptions | undefined,
): {
  prefix: string;
  endpoints: RouterEndpoints;
  options: CreateApiOptions | undefined;
} {
  if (typeof second === "string") {
    if (!third)
      throw new Error("endpoints is required when prefix is provided");
    return {
      prefix: second,
      endpoints: third as RouterEndpoints,
      options: fourth,
    };
  }
  if (isRouterDef(second)) {
    return {
      prefix: second.prefix,
      endpoints: second.endpoints,
      options: third as CreateApiOptions | undefined,
    };
  }
  return {
    prefix: "",
    endpoints: second as RouterEndpoints,
    options: third as CreateApiOptions | undefined,
  };
}

type ResolvedMode = "on" | "off" | "warn";

function validateMode(
  options: CreateApiOptions | undefined,
  kind: "request" | "response",
): ResolvedMode {
  const v = options?.validate;
  const mode =
    v === undefined
      ? true
      : typeof v === "boolean" || v === "warn"
        ? v
        : (v[kind] ?? true);
  return mode === "warn" ? "warn" : mode ? "on" : "off";
}

function buildClient(
  executor: Executor,
  prefix: string,
  endpoints: RouterEndpoints,
  options?: CreateApiOptions,
): Record<string, unknown> {
  const client: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(endpoints)) {
    client[key] = isRouterDef(entry)
      ? buildClient(
          executor,
          joinPaths(prefix, entry.prefix),
          entry.endpoints,
          options,
        )
      : buildEndpointFn(
          executor,
          prefix,
          entry as EndpointSpec<any, any, any>,
          options,
        );
  }

  return client;
}

function buildEndpointFn(
  executor: Executor,
  prefix: string,
  spec: EndpointSpec<any, any, any>,
  options: CreateApiOptions | undefined,
) {
  return async (
    params: RequestShape = {},
    signalOrOptions?: AbortSignal | EndpointCallOptions,
  ) => {
    const call = normalizeCallOptions(signalOrOptions);
    const reqMode = validateMode(options, "request");
    let validatedParams: RequestShape = params;
    let requestError: ValidationError | null = null;
    if (spec.request && reqMode !== "off") {
      try {
        validatedParams = (await runValidator(
          spec.request,
          params,
        )) as RequestShape;
      } catch (err) {
        requestError = new ValidationError("Request validation failed", err);
        if (reqMode !== "warn") throw requestError;
        // 'warn': pass the raw params through and report the drift below.
        validatedParams = params;
      }
    }

    const url = resolvePath(
      joinPaths(prefix, spec.path),
      validatedParams?.path,
    );

    if (requestError) {
      options?.onValidationError?.(requestError, {
        kind: "request",
        method: spec.method,
        url,
        data: params,
      });
    }

    const raw = await executeWithTimeout(executor, call.timeout, {
      method: spec.method,
      url,
      params: validatedParams?.query as Record<string, unknown> | undefined,
      body: validatedParams?.body,
      headers: call.headers,
      signal: call.signal,
    });

    const resMode = validateMode(options, "response");
    let result: ValidatorOutput<typeof spec.response>;
    if (resMode === "off") {
      result = raw;
    } else {
      try {
        result = (await runValidator(
          spec.response,
          raw,
        )) as ValidatorOutput<typeof spec.response>;
      } catch (err) {
        const responseError = new ValidationError(
          "Response validation failed",
          err,
        );
        if (resMode !== "warn") throw responseError;
        // 'warn': report the drift and pass the raw response through.
        options?.onValidationError?.(responseError, {
          kind: "response",
          method: spec.method,
          url,
          data: raw,
        });
        result = raw;
      }
    }

    return spec.adapter ? spec.adapter(result) : result;
  };
}

/**
 * Normalizes the optional second endpoint argument. A bare {@link AbortSignal}
 * (the legacy form) is wrapped as `{ signal }`; an options object is returned
 * as-is. Detection uses `instanceof AbortSignal` with a duck-typed fallback for
 * runtimes/polyfills where the global identity differs.
 */
function normalizeCallOptions(
  arg: AbortSignal | EndpointCallOptions | undefined,
): EndpointCallOptions {
  if (arg == null) return {};
  if (isAbortSignal(arg)) return { signal: arg };
  return arg;
}

function isAbortSignal(value: unknown): value is AbortSignal {
  if (typeof AbortSignal !== "undefined" && value instanceof AbortSignal) {
    return true;
  }
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as AbortSignal).aborted === "boolean" &&
    typeof (value as AbortSignal).addEventListener === "function"
  );
}

/**
 * Runs the executor, applying a per-call timeout when set. The timeout is
 * implemented with an {@link AbortController} so it works across every executor
 * (fetch, Axios, ky, custom) without per-transport support. On expiry the
 * request is aborted with a {@link TimeoutError}.
 */
function executeWithTimeout(
  executor: Executor,
  timeout: number | undefined,
  opts: ExecuteOptions,
): Promise<unknown> {
  if (timeout == null) return executor.execute(opts);

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new TimeoutError(timeout)),
    timeout,
  );
  const { signal, cleanup } = combineSignals(opts.signal, controller.signal);

  return (async () => {
    try {
      return await executor.execute({ ...opts, signal });
    } finally {
      clearTimeout(timer);
      cleanup();
    }
  })();
}

/**
 * Combines an optional caller signal with the timeout controller's signal into
 * a single signal that aborts when either does. Returns a `cleanup` to detach
 * the listener once the request settles.
 */
function combineSignals(
  caller: AbortSignal | undefined,
  timeoutSignal: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  if (!caller) return { signal: timeoutSignal, cleanup: () => {} };
  if (caller.aborted) return { signal: caller, cleanup: () => {} };

  const controller = new AbortController();
  const onCallerAbort = () => controller.abort(caller.reason);
  const onTimeoutAbort = () => controller.abort(timeoutSignal.reason);
  caller.addEventListener("abort", onCallerAbort, { once: true });
  timeoutSignal.addEventListener("abort", onTimeoutAbort, { once: true });
  return {
    signal: controller.signal,
    cleanup: () => {
      caller.removeEventListener("abort", onCallerAbort);
      timeoutSignal.removeEventListener("abort", onTimeoutAbort);
    },
  };
}
