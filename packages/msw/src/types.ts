import type { EndpointSpec, RouterDef, RouterEndpoints } from "@routar/core";

type InferPathParams<TSpec extends EndpointSpec<any, any, any>> =
  TSpec["request"] extends { parse: (d: unknown) => infer TReq }
    ? TReq extends { path: infer P }
      ? P
      : Record<string, string>
    : Record<string, string>;

type InferQueryParams<TSpec extends EndpointSpec<any, any, any>> =
  TSpec["request"] extends { parse: (d: unknown) => infer TReq }
    ? TReq extends { query: infer Q }
      ? Q
      : Record<string, string | string[]>
    : Record<string, string | string[]>;

type InferBody<TSpec extends EndpointSpec<any, any, any>> =
  TSpec["request"] extends { parse: (d: unknown) => infer TReq }
    ? TReq extends { body: infer B }
      ? B
      : unknown
    : unknown;

export interface MswResolverContext<TSpec extends EndpointSpec<any, any, any>> {
  /** Typed path parameters parsed from the endpoint's request schema. */
  params: InferPathParams<TSpec>;
  /** Typed query parameters parsed from the endpoint's request schema. */
  query: InferQueryParams<TSpec>;
  /** Typed request body parsed from the endpoint's request schema. */
  body: InferBody<TSpec>;
  /** Raw MSW v2 `Request` object for advanced use (headers, etc). */
  request: Request;
  cookies: Record<string, string>;
}

export type MswResolver<TSpec extends EndpointSpec<any, any, any>> = (
  context: MswResolverContext<TSpec>,
) => Response | Promise<Response>;

/** Mirrors the router's endpoint shape; all keys are optional (partial mocking). */
export type MswResolverMap<TEndpoints extends RouterEndpoints> = {
  [K in keyof TEndpoints]?: TEndpoints[K] extends RouterDef<infer N>
    ? MswResolverMap<N>
    : TEndpoints[K] extends EndpointSpec<any, any, any>
      ? MswResolver<TEndpoints[K]>
      : never;
};
