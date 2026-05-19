import type {
  Executor,
  RouterDef,
  RouterEndpoints,
  EndpointSpec,
  InferResponse,
  RequestShape,
} from './types.js';
import { joinPaths, resolvePath } from './utils/path.js';
import { ValidationError } from './utils/validate.js';

/** Callable type for a single endpoint on the generated API client. */
type EndpointFn<TSpec extends EndpointSpec<any, any, any>> = (
  params: TSpec['request'] extends { parse: (data: unknown) => infer R } ? R : RequestShape,
  signal?: AbortSignal,
) => Promise<InferResponse<TSpec>>;

/** Fully-typed API client produced by {@link createApi}. */
type ApiClient<TEndpoints extends RouterEndpoints> = {
  [K in keyof TEndpoints]: EndpointFn<TEndpoints[K]>;
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
 *
 * @example
 * ```ts
 * const todoApi = createApi(executor, todoRouter);
 * const todos = await todoApi.getList({});
 * const todo  = await todoApi.getDetail({ path: { id: 1 } });
 * ```
 */
export function createApi<TEndpoints extends RouterEndpoints>(
  executor: Executor,
  router: RouterDef<TEndpoints>,
): ApiClient<TEndpoints>;

/**
 * @param executor - Transport to use for every HTTP call.
 * @param prefix - URL prefix prepended to every endpoint path.
 * @param endpoints - Record of named endpoint specs.
 */
export function createApi<TEndpoints extends RouterEndpoints>(
  executor: Executor,
  prefix: string,
  endpoints: TEndpoints,
): ApiClient<TEndpoints>;

/**
 * @param executor - Transport to use for every HTTP call.
 * @param endpoints - Record of named endpoint specs (no URL prefix).
 */
export function createApi<TEndpoints extends RouterEndpoints>(
  executor: Executor,
  endpoints: TEndpoints,
): ApiClient<TEndpoints>;

export function createApi(
  executor: Executor,
  routerOrPrefixOrEndpoints: RouterDef<any> | RouterEndpoints | string,
  endpointsArg?: RouterEndpoints,
): Record<string, (params: any, signal?: AbortSignal) => Promise<unknown>> {
  let prefix: string;
  let endpoints: RouterEndpoints;

  if (typeof routerOrPrefixOrEndpoints === 'string') {
    prefix = routerOrPrefixOrEndpoints;
    if (!endpointsArg) throw new Error('endpoints is required when prefix is provided');
    endpoints = endpointsArg;
  } else if (
    'prefix' in routerOrPrefixOrEndpoints &&
    'endpoints' in routerOrPrefixOrEndpoints
  ) {
    prefix = (routerOrPrefixOrEndpoints as RouterDef<any>).prefix;
    endpoints = (routerOrPrefixOrEndpoints as RouterDef<any>).endpoints;
  } else {
    prefix = '';
    endpoints = routerOrPrefixOrEndpoints as RouterEndpoints;
  }

  const client: Record<string, (params: any, signal?: AbortSignal) => Promise<unknown>> = {};

  for (const [key, spec] of Object.entries(endpoints)) {
    client[key] = async (params: RequestShape = {}, signal?: AbortSignal) => {
      let validatedParams: RequestShape = params;
      if (spec.request) {
        try {
          validatedParams = spec.request.parse(params);
        } catch (err) {
          throw new ValidationError('Request validation failed', err);
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

      let validated: unknown;
      try {
        validated = spec.response.parse(raw);
      } catch (err) {
        throw new ValidationError('Response validation failed', err);
      }

      if (spec.adapter) {
        return spec.adapter(validated as any);
      }
      return validated;
    };
  }

  return client;
}
