import { http, type RequestHandler } from "msw";
import { isRouterDef, joinPaths } from "@routar/core";
import type { EndpointSpec, RouterDef, RouterEndpoints } from "@routar/core";
import type { MswResolverMap } from "./types.js";
import { parseBody, parseQueryFromUrl } from "./utils/parse-request.js";

const httpMethodMap = {
  GET: http.get,
  POST: http.post,
  PUT: http.put,
  PATCH: http.patch,
  DELETE: http.delete,
} as const;

/**
 * Generates MSW v2 `RequestHandler[]` from a {@link RouterDef} and a
 * resolver map that mirrors the router's shape.
 *
 * Only endpoints with a corresponding resolver in `resolvers` get a handler —
 * omitted endpoints are left unregistered and pass through MSW naturally.
 *
 * Path params, query params, and request body are parsed through the
 * endpoint's `request` schema (if present) before being passed to the
 * resolver, giving fully-typed context.
 *
 * @example
 * ```ts
 * const handlers = createMswHandlers(todoRouter, 'https://api.example.com', {
 *   getList: () => HttpResponse.json([{ id: 1, title: 'Todo' }]),
 *   getDetail: ({ params }) => HttpResponse.json({ id: params.id, title: 'Todo' }),
 * });
 *
 * const server = setupServer(...handlers);
 * ```
 */
export function createMswHandlers<TEndpoints extends RouterEndpoints>(
  router: RouterDef<TEndpoints>,
  baseURL: string,
  resolvers: MswResolverMap<TEndpoints>,
): RequestHandler[] {
  return walkRouter(
    router.prefix,
    router.endpoints,
    resolvers as MswResolverMap<RouterEndpoints>,
    baseURL.replace(/\/$/, ""),
  );
}

function walkRouter(
  prefix: string,
  endpoints: RouterEndpoints,
  resolvers: MswResolverMap<RouterEndpoints>,
  baseURL: string,
): RequestHandler[] {
  const handlers: RequestHandler[] = [];

  for (const [key, entry] of Object.entries(endpoints)) {
    const resolver = resolvers[key];
    if (resolver === undefined) continue;

    if (isRouterDef(entry)) {
      handlers.push(
        ...walkRouter(
          joinPaths(prefix, entry.prefix),
          entry.endpoints,
          resolver as MswResolverMap<RouterEndpoints>,
          baseURL,
        ),
      );
    } else {
      const spec = entry as EndpointSpec<any, any, any>;
      const fullUrl = baseURL + joinPaths(prefix, spec.path);
      const register = httpMethodMap[spec.method];

      handlers.push(
        register(fullUrl, async ({ request, params, cookies }) => {
          const rawQuery = parseQueryFromUrl(request.url);
          const rawBody = await parseBody(request);
          const raw = { path: params, query: rawQuery, body: rawBody };
          const parsed = spec.request ? spec.request.parse(raw) : raw;

          return (resolver as (ctx: unknown) => Response | Promise<Response>)({
            params: (parsed as any).path ?? params,
            query: (parsed as any).query ?? rawQuery,
            body: (parsed as any).body,
            request,
            cookies,
          });
        }),
      );
    }
  }

  return handlers;
}
