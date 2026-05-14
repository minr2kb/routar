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

type EndpointFn<TSpec extends EndpointSpec<any, any, any>> = (
  params: TSpec['request'] extends { parse: (data: unknown) => infer R } ? R : RequestShape,
  signal?: AbortSignal,
) => Promise<InferResponse<TSpec>>;

type ApiClient<TEndpoints extends RouterEndpoints> = {
  [K in keyof TEndpoints]: EndpointFn<TEndpoints[K]>;
};

export function createApi<TEndpoints extends RouterEndpoints>(
  executor: Executor,
  router: RouterDef<TEndpoints>,
): ApiClient<TEndpoints>;

export function createApi<TEndpoints extends RouterEndpoints>(
  executor: Executor,
  prefix: string,
  endpoints: TEndpoints,
): ApiClient<TEndpoints>;

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
    endpoints = endpointsArg!;
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
      // Step 1: validate request if schema provided
      let validatedParams: RequestShape = params;
      if (spec.request) {
        try {
          validatedParams = spec.request.parse(params);
        } catch (err) {
          throw new ValidationError('Request validation failed', err);
        }
      }

      // Step 2: build URL
      const url = resolvePath(
        joinPaths(prefix, spec.path),
        validatedParams?.path,
      );

      // Step 3: execute
      const raw = await executor.execute({
        method: spec.method,
        url,
        params: validatedParams?.query as Record<string, unknown> | undefined,
        body: validatedParams?.body,
        signal,
      });

      // Step 4: validate response
      let validated: unknown;
      try {
        validated = spec.response.parse(raw);
      } catch (err) {
        throw new ValidationError('Response validation failed', err);
      }

      // Step 5: apply adapter
      if (spec.adapter) {
        return spec.adapter(validated as any);
      }
      return validated;
    };
  }

  return client;
}
