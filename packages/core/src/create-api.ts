import { isRouterDef } from "./define-router.js";
import type {
  CreateApiOptions,
  EndpointSpec,
  Executor,
  InferResponse,
  RequestShape,
  RouterDef,
  RouterEndpoints,
  ValidatorOutput,
} from "./types.js";
import { joinPaths, resolvePath } from "./utils/path.js";
import { ValidationError } from "./utils/validate.js";

/** Callable type for a single endpoint on the generated API client. */
type EndpointFn<TSpec extends EndpointSpec<any, any, any>> =
  TSpec["request"] extends { parse: (data: unknown) => infer R }
    ? (params: R, signal?: AbortSignal) => Promise<InferResponse<TSpec>>
    : (
        params?: RequestShape,
        signal?: AbortSignal,
      ) => Promise<InferResponse<TSpec>>;

/**
 * Fully-typed API client produced by {@link createApi}.
 * Nested {@link RouterDef} entries become nested sub-client objects.
 */
type ApiClient<TEndpoints extends RouterEndpoints> = {
  [K in keyof TEndpoints]: TEndpoints[K] extends RouterDef<
    infer TNestedEndpoints
  >
    ? ApiClient<TNestedEndpoints>
    : TEndpoints[K] extends EndpointSpec<any, any, any>
      ? EndpointFn<TEndpoints[K]>
      : never;
};

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
 * @example
 * ```ts
 * const todoApi = createApi(executor, todoRouter);
 * const todos = await todoApi.getList({});
 * const todo  = await todoApi.getDetail({ path: { id: 1 } });
 *
 * // Skip response validation in production
 * const prodApi = createApi(executor, todoRouter, {
 *   validate: { request: true, response: process.env.NODE_ENV !== 'production' },
 * });
 * ```
 */
export function createApi<TEndpoints extends RouterEndpoints>(
  executor: Executor,
  router: RouterDef<TEndpoints>,
  options?: CreateApiOptions,
): ApiClient<TEndpoints>;

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
): ApiClient<TEndpoints>;

/**
 * @param executor - Transport to use for every HTTP call.
 * @param endpoints - Record of named endpoint specs (no URL prefix).
 * @param options - Optional settings.
 */
export function createApi<TEndpoints extends RouterEndpoints>(
  executor: Executor,
  endpoints: TEndpoints,
  options?: CreateApiOptions,
): ApiClient<TEndpoints>;

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
  return buildClient(executor, prefix, endpoints, options);
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

function shouldValidate(
  options: CreateApiOptions | undefined,
  kind: "request" | "response",
): boolean {
  const v = options?.validate;
  if (v === undefined || v === true) return true;
  if (v === false) return false;
  return v[kind] ?? true;
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
      ? buildClient(executor, joinPaths(prefix, entry.prefix), entry.endpoints, options)
      : buildEndpointFn(executor, prefix, entry as EndpointSpec<any, any, any>, options);
  }

  return client;
}

function buildEndpointFn(
  executor: Executor,
  prefix: string,
  spec: EndpointSpec<any, any, any>,
  options: CreateApiOptions | undefined,
) {
  return async (params: RequestShape = {}, signal?: AbortSignal) => {
    let validatedParams: RequestShape = params;
    if (spec.request && shouldValidate(options, "request")) {
      try {
        validatedParams = spec.request.parse(params);
      } catch (err) {
        throw new ValidationError("Request validation failed", err);
      }
    }

    const url = resolvePath(joinPaths(prefix, spec.path), validatedParams?.path);

    const raw = await executor.execute({
      method: spec.method,
      url,
      params: validatedParams?.query as Record<string, unknown> | undefined,
      body: validatedParams?.body,
      signal,
    });

    let result: ValidatorOutput<typeof spec.response>;
    if (shouldValidate(options, "response")) {
      try {
        result = spec.response.parse(raw);
      } catch (err) {
        throw new ValidationError("Response validation failed", err);
      }
    } else {
      result = raw;
    }

    return spec.adapter ? spec.adapter(result) : result;
  };
}
