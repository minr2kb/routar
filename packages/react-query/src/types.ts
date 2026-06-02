import type {
  EndpointSpec,
  InferResponse,
  RouterDef,
  RouterEndpoints,
} from "@routar/core";
import type {
  DataTag,
  DefaultError,
  QueryFunction,
  QueryKey,
  SkipToken,
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";

/** Options accepted by createQueries. */
export interface CreateQueriesOptions {
  /** Overrides the root key segment(s); defaults to the router prefix segments. */
  key?: string;
}

/** The request/params type of an endpoint, or `void` when it has no `request`. */
export type EndpointParams<TSpec> = TSpec extends {
  request: { parse: (data: unknown) => infer R };
}
  ? R
  : void;

/** Query-only options (everything TanStack accepts except key/fn). */
export type QueryAccessorOptions<TData> = Omit<
  UseQueryOptions<TData, DefaultError, TData, QueryKey>,
  "queryKey" | "queryFn"
>;

/** The shape returned by a query accessor — matches TanStack's `queryOptions()`.
 * `queryFn` explicitly excludes `SkipToken` so the result is assignable to
 * both `useQuery` and `useSuspenseQuery` (which rejects `skipToken`).
 */
export type QueryAccessorResult<TData> = Omit<
  UseQueryOptions<TData, DefaultError, TData, QueryKey>,
  "queryFn"
> & {
  queryFn?: QueryFunction<TData, QueryKey, never>;
  queryKey: DataTag<QueryKey, TData, DefaultError>;
};

/** True when the accessor can be called with no params (no request, or fully-optional request). */
type ParamsOptional<TParams> = [TParams] extends [void]
  ? true
  : {} extends TParams
    ? true
    : false;

/** A GET endpoint exposed as a query-options factory. */
export type QueryAccessor<TParams, TData> = (ParamsOptional<TParams> extends true
  ? (
      params?: TParams,
      options?: QueryAccessorOptions<TData>,
    ) => QueryAccessorResult<TData>
  : (
      params: TParams,
      options?: QueryAccessorOptions<TData>,
    ) => QueryAccessorResult<TData>) & {
  queryKey: (params?: TParams) => DataTag<QueryKey, TData, DefaultError>;
};

/** Mutation options plus the declarative `invalidates` sugar. */
export type RoutarMutationOptions<TData, TVars> = Omit<
  UseMutationOptions<TData, DefaultError, TVars>,
  "mutationFn" | "mutationKey"
> & { invalidates?: QueryKey[] };

/** A non-GET endpoint exposed as a mutation-options factory. */
export type MutationAccessor<TVars, TData> = ((
  options?: RoutarMutationOptions<TData, TVars>,
) => UseMutationOptions<TData, DefaultError, TVars>) & {
  mutationKey: QueryKey;
};

/** Recursively maps a router's endpoints to query/mutation accessors. */
export type Queries<TEndpoints extends RouterEndpoints> = {
  [K in keyof TEndpoints]: TEndpoints[K] extends RouterDef<infer Nested>
    ? Queries<Nested>
    : TEndpoints[K] extends EndpointSpec<any, any, any>
      ? TEndpoints[K]["method"] extends "GET"
        ? QueryAccessor<
            EndpointParams<TEndpoints[K]>,
            InferResponse<TEndpoints[K]>
          >
        : MutationAccessor<
            EndpointParams<TEndpoints[K]>,
            InferResponse<TEndpoints[K]>
          >
      : never;
} & { $key: QueryKey };
