import { http, type HttpHandler } from "msw";
import { isRouterDef, joinPaths } from "@routar/core";
import type { EndpointSpec, RouterDef, RouterEndpoints } from "@routar/core";
import type { MswResolver, MswResolverMap } from "./types.js";
import { parseBody, parseQueryFromUrl } from "./utils/parse-request.js";

const httpMethodMap = {
  GET: http.get,
  POST: http.post,
  PUT: http.put,
  PATCH: http.patch,
  DELETE: http.delete,
} as const;

type AnyEndpointSpec = EndpointSpec<any, any, any>;
type AnyResolver = MswResolver<AnyEndpointSpec>;
type RequestParts = { path?: unknown; query?: unknown; body?: unknown };

/**
 * Generates MSW v2 `HttpHandler[]` from a {@link RouterDef} and a resolver
 * map that mirrors the router's shape.
 *
 * Only endpoints with a corresponding resolver in `resolvers` get a handler —
 * omitted endpoints are left unregistered and pass through MSW naturally.
 *
 * When an endpoint's `request` schema is present, it is parsed against
 * `{ path, query, body }` from the incoming request before the resolver is
 * called. Fields not covered by the schema retain their raw MSW values (path
 * params as strings, query as `Record<string, string | string[]>`).
 *
 * **Path param coercion:** MSW path params are always strings. Use
 * `z.coerce.number()` (not `z.number()`) for numeric IDs so the schema
 * coerces `"42"` → `42` before the resolver receives it.
 *
 * @example Basic vitest/jest setup
 * ```ts
 * import { createMswHandlers } from '@routar/msw';
 * import { HttpResponse } from 'msw';
 * import { setupServer } from 'msw/node';
 *
 * const server = setupServer(
 *   ...createMswHandlers(todoRouter, 'https://api.example.com', {
 *     getList: () =>
 *       HttpResponse.json([{ id: 1, title: 'Buy milk', completed: false }]),
 *     getDetail: ({ params }) =>
 *       HttpResponse.json({ id: params.id, title: 'Buy milk', completed: false }),
 *     create: ({ body }) =>
 *       HttpResponse.json({ id: 2, title: body.title, completed: false }),
 *   }),
 * );
 *
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 *
 * @example Partial mocking — only listed endpoints are intercepted; the rest pass through
 * ```ts
 * createMswHandlers(todoRouter, 'https://api.example.com', {
 *   getList: () => HttpResponse.json([]),
 *   // getDetail, create → not registered, requests reach the real server
 * });
 * ```
 *
 * @example Nested routers — resolver map mirrors the router shape
 * ```ts
 * const apiRouter = defineRouter('/api', { todos: todoRouter, users: userRouter });
 *
 * createMswHandlers(apiRouter, 'https://api.example.com', {
 *   todos: {
 *     getList: () => HttpResponse.json([]),
 *     getDetail: ({ params }) => HttpResponse.json({ id: Number(params.id) }),
 *   },
 *   users: { getList: () => HttpResponse.json([]) },
 * });
 * ```
 */
export function createMswHandlers<TEndpoints extends RouterEndpoints>(
  router: RouterDef<TEndpoints>,
  baseURL: string,
  resolvers: MswResolverMap<TEndpoints>,
): HttpHandler[] {
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
): HttpHandler[] {
  const handlers: HttpHandler[] = [];

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
      const spec = entry as AnyEndpointSpec;
      const fn = resolver as AnyResolver;
      const fullUrl = baseURL + joinPaths(prefix, spec.path);
      const register = httpMethodMap[spec.method];

      handlers.push(
        register(fullUrl, async ({ request, params, cookies }) => {
          const raw: RequestParts = {
            path: params,
            query: parseQueryFromUrl(request.url),
            body: await parseBody(request),
          };

          // Spread raw first so that fields absent from the schema (which Zod
          // strips) keep their raw values; schema-validated fields override them.
          const parts: RequestParts = spec.request
            ? { ...raw, ...(spec.request.parse(raw) as RequestParts) }
            : raw;

          return fn({
            params: parts.path as Parameters<AnyResolver>[0]["params"],
            query: parts.query as Parameters<AnyResolver>[0]["query"],
            body: parts.body as Parameters<AnyResolver>[0]["body"],
            request,
            cookies,
          });
        }),
      );
    }
  }

  return handlers;
}
