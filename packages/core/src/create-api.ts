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
    : (params?: RequestShape, signal?: AbortSignal) => Promise<InferResponse<TSpec>>;

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
  let prefix: string;
  let endpoints: RouterEndpoints;
  let options: CreateApiOptions | undefined;

  if (typeof routerOrPrefixOrEndpoints === "string") {
    prefix = routerOrPrefixOrEndpoints;
    if (!endpointsArgOrOptions)
      throw new Error("endpoints is required when prefix is provided");
    endpoints = endpointsArgOrOptions as RouterEndpoints;
    options = optionsArg;
  } else if (
    "prefix" in routerOrPrefixOrEndpoints &&
    "endpoints" in routerOrPrefixOrEndpoints &&
    !("method" in routerOrPrefixOrEndpoints)
  ) {
    prefix = (routerOrPrefixOrEndpoints as RouterDef<RouterEndpoints>).prefix;
    endpoints = (routerOrPrefixOrEndpoints as RouterDef<RouterEndpoints>)
      .endpoints;
    options = endpointsArgOrOptions as CreateApiOptions | undefined;
  } else {
    prefix = "";
    endpoints = routerOrPrefixOrEndpoints as RouterEndpoints;
    options = endpointsArgOrOptions as CreateApiOptions | undefined;
  }

  return buildClient(executor, prefix, endpoints, options);
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
    if ("prefix" in entry && "endpoints" in entry && !("method" in entry)) {
      // Nested RouterDef — recurse with merged prefix
      const nested = entry as RouterDef<RouterEndpoints>;
      client[key] = buildClient(
        executor,
        joinPaths(prefix, nested.prefix),
        nested.endpoints,
        options,
      );
    } else {
      // Leaf EndpointSpec
      const spec = entry as EndpointSpec<any, any, any>;
      client[key] = async (params: RequestShape = {}, signal?: AbortSignal) => {
        let validatedParams: RequestShape = params;
        if (spec.request && shouldValidate(options, "request")) {
          try {
            validatedParams = spec.request.parse(params);
          } catch (err) {
            throw new ValidationError("Request validation failed", err);
          }
        }

        const url = resolvePath(
          joinPaths(prefix, spec.path),
          validatedParams?.path,
        );

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

        if (spec.adapter) {
          return spec.adapter(result);
        }
        return result;
      };
    }
  }

  return client;
}
