import type {
  EndpointSpec,
  InferResponse,
  RouterDef,
  RouterEndpoints,
} from "@routar/core";
import type {
  DataTag,
  DefaultError,
  GetNextPageParamFunction,
  InfiniteData,
  QueryFunction,
  QueryKey,
  UseInfiniteQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";

/** Recursive partial — the return type of an infinite `pageParam` builder. */
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

/**
 * Per-endpoint default options, keyed by endpoint name. Merged into every
 * accessor call *before* the per-call options, so a call-site option always
 * wins. Lets you colocate per-resource policy (e.g. `getDetail: { staleTime }`)
 * instead of repeating it at each call. Top-level endpoints only — nested
 * routers are not matched.
 */
export type EndpointDefaults<TEndpoints extends RouterEndpoints> = {
  [K in keyof TEndpoints]?:
    | QueryAccessorOptions<unknown>
    | Omit<RoutarMutationOptions<unknown, unknown>, "invalidates">;
};

/** Options accepted by createQueries. */
export interface CreateQueriesOptions<
  TEndpoints extends RouterEndpoints = RouterEndpoints,
> {
  /** Overrides the root key segment(s); defaults to the router prefix segments. */
  key?: string;
  /** Per-endpoint default options merged before each call's options. */
  defaults?: EndpointDefaults<TEndpoints>;
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

/**
 * Options for an infinite query accessor. Everything `useInfiniteQuery` accepts
 * (minus the library-managed `queryKey`/`queryFn`), with `initialPageParam` and
 * `getNextPageParam` required, plus the routar-specific `pageParam` builder that
 * maps a page param into a partial request, deep-merged into the base params.
 *
 * `pageParam` replaces the native `queryFn` — you describe *where the page param
 * goes in the request* instead of writing the fetch call yourself.
 */
export type InfiniteAccessorOptions<TPage, TParams, TPageParam> = Omit<
  UseInfiniteQueryOptions<
    TPage,
    DefaultError,
    InfiniteData<TPage, TPageParam>,
    QueryKey,
    TPageParam
  >,
  "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
> & {
  initialPageParam: TPageParam;
  getNextPageParam: GetNextPageParamFunction<TPageParam, TPage>;
  /** Maps a page param to the partial request merged into the base params. */
  pageParam: (pageParam: TPageParam) => DeepPartial<TParams>;
};

/** The shape returned by an infinite accessor — matches `infiniteQueryOptions()`. */
export type InfiniteAccessorResult<TPage, TPageParam> = Omit<
  UseInfiniteQueryOptions<
    TPage,
    DefaultError,
    InfiniteData<TPage, TPageParam>,
    QueryKey,
    TPageParam
  >,
  "queryFn" | "queryKey"
> & {
  queryFn?: QueryFunction<TPage, QueryKey, TPageParam>;
  queryKey: DataTag<QueryKey, InfiniteData<TPage, TPageParam>, DefaultError>;
};

/**
 * A GET endpoint exposed as an infinite-query-options factory.
 * `params` is the base (page-independent) request; the options object is
 * required (`initialPageParam` + `getNextPageParam` + `pageParam`). Pass
 * `undefined`/`{}` as `params` for endpoints that take no base params.
 */
export interface InfiniteAccessor<TParams, TPage> {
  <TPageParam = number>(
    params: TParams,
    options: InfiniteAccessorOptions<TPage, TParams, TPageParam>,
  ): InfiniteAccessorResult<TPage, TPageParam>;
  queryKey: (params?: TParams) => QueryKey;
}

/** A GET endpoint exposed as a query-options factory. */
export type QueryAccessor<TParams, TData> =
  (ParamsOptional<TParams> extends true
    ? (
        params?: TParams,
        options?: QueryAccessorOptions<TData>,
      ) => QueryAccessorResult<TData>
    : (
        params: TParams,
        options?: QueryAccessorOptions<TData>,
      ) => QueryAccessorResult<TData>) & {
    queryKey: (params?: TParams) => DataTag<QueryKey, TData, DefaultError>;
    /** Infinite-query variant of this endpoint (see {@link InfiniteAccessor}). */
    infinite: InfiniteAccessor<TParams, TData>;
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
