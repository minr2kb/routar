import type { RouterDef, RouterEndpoints } from './types.js';

/**
 * Groups a set of endpoint specs under a shared URL prefix.
 *
 * The returned {@link RouterDef} can be passed directly to {@link createApi}
 * to produce a fully-typed API client.
 *
 * @param prefix - Base path prepended to every endpoint's `path` (e.g. `'/todos'`).
 * @param endpoints - Record of named {@link EndpointSpec}s.
 *
 * @example
 * ```ts
 * export const todoRouter = defineRouter('/todos', {
 *   getList: endpoint({ method: 'GET',  path: '/',    response: TodoListSchema }),
 *   getDetail: endpoint({ method: 'GET',  path: '/:id', response: TodoSchema }),
 *   create:  endpoint({ method: 'POST', path: '/',    response: TodoSchema }),
 * });
 * ```
 */
export function defineRouter<TEndpoints extends RouterEndpoints>(
  prefix: string,
  endpoints: TEndpoints,
): RouterDef<TEndpoints> {
  return { prefix, endpoints };
}
