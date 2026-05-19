export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ExecuteOptions {
  method: HttpMethod;
  url: string;
  params?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface Executor {
  execute(options: ExecuteOptions): Promise<unknown>;
}

export type ExecutorMiddleware = (
  options: ExecuteOptions,
  next: (options: ExecuteOptions) => Promise<unknown>,
) => Promise<unknown>;

export interface Validator<TOutput> {
  parse(data: unknown): TOutput;
}

export type ValidatorOutput<T extends Validator<unknown>> =
  T extends Validator<infer O> ? O : never;

export interface RequestShape {
  path?:  Record<string, unknown>;
  query?: Record<string, unknown>;
  body?:  unknown;
}

export interface EndpointSpec<
  TRequest extends RequestShape        = RequestShape,
  TResponse extends Validator<unknown> = Validator<unknown>,
  TAdapter extends
    | ((raw: ValidatorOutput<TResponse>) => unknown)
    | undefined                        = undefined,
> {
  method:   HttpMethod;
  path:     string;
  request?: Validator<TRequest>;
  response: TResponse;
  adapter?: TAdapter;
}

export type InferResponse<TSpec extends EndpointSpec<any, any, any>> =
  TSpec['adapter'] extends (raw: any) => infer R
    ? R
    : ValidatorOutput<TSpec['response']>;

export type RouterEndpoints = Record<string, EndpointSpec<any, any, any>>;

export interface RouterDef<TEndpoints extends RouterEndpoints = RouterEndpoints> {
  prefix:    string;
  endpoints: TEndpoints;
}

export type ApiTypes<TApi> = {
  [K in keyof TApi]: TApi[K] extends (...args: any[]) => Promise<infer R>
    ? {
        request:  Parameters<TApi[K]>[0];
        response: R;
      }
    : never;
};
