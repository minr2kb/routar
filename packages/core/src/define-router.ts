import type { RouterDef, RouterEndpoints } from "./types.js";

/**
 * Groups a set of endpoint specs (and optional nested routers) under a shared
 * URL prefix.
 *
 * The returned {@link RouterDef} can be passed directly to {@link createApi}
 * to produce a fully-typed API client. Nesting another {@link RouterDef} as a
 * value creates a sub-client whose prefix is the concatenation of both prefixes.
 *
 * @param prefix - Base path prepended to every endpoint's `path` (e.g. `'/users'`).
 * @param endpoints - Record of named {@link EndpointSpec}s or nested {@link RouterDef}s.
 *
 * @example
 * ```ts
 * // Flat router
 * export const todoRouter = defineRouter('/todos', {
 *   getList:   endpoint({ method: 'GET',  path: '/',    response: TodoListSchema }),
 *   getDetail: endpoint({ method: 'GET',  path: '/:id', response: TodoSchema }),
 *   create:    endpoint({ method: 'POST', path: '/',    response: TodoSchema }),
 * });
 *
 * // Nested router — api.users.todos.getList() resolves to GET /users/todos/
 * export const userRouter = defineRouter('/users', {
 *   getList: endpoint({ method: 'GET', path: '/', response: UserListSchema }),
 *   todos: defineRouter('/todos', {
 *     getList:   endpoint({ method: 'GET',  path: '/',    response: TodoListSchema }),
 *     getDetail: endpoint({ method: 'GET',  path: '/:id', response: TodoSchema }),
 *   }),
 * });
 * ```
 */
/** Type guard — distinguishes a {@link RouterDef} from a leaf {@link EndpointSpec} at runtime. */
export function isRouterDef(entry: object): entry is RouterDef<RouterEndpoints> {
  return "prefix" in entry && "endpoints" in entry;
}

export function defineRouter<TEndpoints extends RouterEndpoints>(
  prefix: string,
  endpoints: TEndpoints,
): RouterDef<TEndpoints> {
  return { prefix, endpoints };
}
