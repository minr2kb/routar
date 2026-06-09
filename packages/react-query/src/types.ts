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
 * The normalized envelope shape of an endpoint's request params:
 * `{ path?, query?, body? }`. `body` is `unknown` because a request body may be
 * an arbitrary value (object, array, primitive) — same intent as core's
 * `RequestShape.body: unknown`.
 */
type Envelope = { path?: object; query?: object; body?: unknown };

/**
 * Flattens the three request buckets into a single object type. A non-object
 * `body` (e.g. `z.array`/`z.string`) contributes `{}` here and is separately
 * blocked from flattening by {@link BodyFlattenable}. The intersections with
 * `{}` are intentional — an absent bucket should contribute nothing to the
 * merged shape.
 */
export type Flatten<R extends Envelope> = (R extends { path: infer P }
  ? P
  : {}) &
  (R extends { query: infer Q } ? Q : {}) &
  (R extends { body: infer B } ? (B extends object ? B : {}) : {});

type KeysOf<T> = T extends object ? keyof T : never;
type PathK<R> = R extends { path: infer P } ? KeysOf<P> : never;
type QueryK<R> = R extends { query: infer Q } ? KeysOf<Q> : never;
type BodyK<R> = R extends { body: infer B }
  ? B extends object
    ? KeysOf<B>
    : never
  : never;

/**
 * True when the same key appears in two or more buckets (e.g. `path.id` +
 * `body.id`), which makes a flat shape ambiguous. The `[X] extends [never]`
 * tuple wrapping defeats `never`'s distributive short-circuit so an empty
 * intersection is correctly detected as "no overlap" — this `never` usage is
 * intentional (empty-key detection), not an accident.
 */
export type HasOverlap<R extends Envelope> = [PathK<R> & QueryK<R>] extends [
  never,
]
  ? [PathK<R> & BodyK<R>] extends [never]
    ? [QueryK<R> & BodyK<R>] extends [never]
      ? false
      : true
    : true
  : true;

/**
 * False when `body` is present but not a plain object (e.g. `z.array`/`z.string`)
 * — such a body can't be spread into the flat shape, so the envelope is kept.
 */
export type BodyFlattenable<R extends Envelope> = R extends { body: infer B }
  ? B extends object
    ? B extends readonly unknown[]
      ? false
      : true
    : false
  : true;

/**
 * The accessor params type under `flatten: true`: the flattened shape when the
 * request can be safely flattened, otherwise the envelope unchanged (key
 * collision or non-object body). The standalone `.queryKey()`/`.mutationKey`
 * helpers always stay on the envelope, independent of this.
 */
export type Safe<R extends Envelope> = HasOverlap<R> extends true
  ? R
  : BodyFlattenable<R> extends true
    ? Flatten<R>
    : R;

/**
 * Applies {@link Safe} only when `TFlatten` is `true` and the params are an
 * envelope; otherwise the params pass through unchanged (default path).
 */
type ApplyFlatten<TParams, TFlatten extends boolean> = TFlatten extends true
  ? TParams extends Envelope
    ? Safe<TParams>
    : TParams
  : TParams;

/** The static (object) form of a per-endpoint default. */
type StaticDefault =
  | QueryAccessorOptions<unknown>
  | RoutarMutationOptions<unknown, unknown>;

/**
 * One per-endpoint default value: either a static options object, or a function
 * `(params, q) => options` evaluated lazily. The function form receives the
 * fully-built `q` (every key helper available, no circular-reference issues) and
 * the call params (`undefined` for mutations). See {@link EndpointDefaults}.
 */
type EndpointDefaultValue<TQ> =
  | StaticDefault
  | ((params: unknown, q: TQ) => StaticDefault);

/**
 * Per-endpoint default options, keyed by endpoint name. Merged into every
 * accessor call *before* the per-call options, so a call-site option always
 * wins. Lets you colocate per-resource policy (e.g. `getDetail: { staleTime }`)
 * instead of repeating it at each call. Nested routers are matched recursively.
 *
 * Each value may be a static object or a function `(params, q) => options` — the
 * function receives the completed `q` (use its key helpers in `invalidates`) and
 * the call params (`undefined` for mutations).
 */
export type EndpointDefaults<
  TEndpoints extends RouterEndpoints,
  TQ = Queries<TEndpoints>,
> = {
  [K in keyof TEndpoints]?: TEndpoints[K] extends RouterDef<infer Nested>
    ? EndpointDefaults<Nested, TQ>
    : TEndpoints[K] extends EndpointSpec<any, any, any>
      ? EndpointDefaultValue<TQ>
      : never;
};

/** Options accepted by createQueries. */
export interface CreateQueriesOptions<
  TEndpoints extends RouterEndpoints = RouterEndpoints,
  TFlatten extends boolean = false,
> {
  /** Overrides the root key segment(s); defaults to the router prefix segments. */
  key?: string;
  /** Per-endpoint default options merged before each call's options. */
  defaults?: EndpointDefaults<TEndpoints, Queries<TEndpoints, TFlatten>>;
  /**
   * Per-endpoint infinite (pagination) contract, keyed by GET endpoint name.
   * Declared once here; each `.infinite()` call may override it. See
   * {@link InfiniteConfigMap}.
   */
  infinite?: InfiniteConfigMap<TEndpoints>;
  /**
   * When `true`, accessors accept *flat* params — the union of the request's
   * `path`/`query`/`body` fields (`getDetail({ id })`) instead of the nested
   * envelope (`getDetail({ path: { id } })`). Endpoints whose buckets collide on
   * a key, or whose `body` isn't a plain object, fall back to the envelope. The
   * query key is always built from the envelope, so both call styles converge.
   */
  flatten?: TFlatten;
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
 * Per-endpoint infinite (pagination) config, keyed by GET endpoint name —
 * passed to `createQueries(api, { infinite })`. Each value is the full infinite
 * contract for that endpoint. Top-level endpoints only.
 */
export type InfiniteConfigMap<TEndpoints extends RouterEndpoints> = {
  // Keep GET endpoints (their contract) and nested routers (recursed); drop
  // non-GET endpoints.
  [K in keyof TEndpoints as TEndpoints[K] extends RouterDef<any>
    ? K
    : TEndpoints[K] extends EndpointSpec<any, any, any>
      ? TEndpoints[K]["method"] extends "GET"
        ? K
        : never
      : never]?: TEndpoints[K] extends RouterDef<infer Nested>
    ? InfiniteConfigMap<Nested>
    : TEndpoints[K] extends EndpointSpec<any, any, any>
      ? InfiniteAccessorOptions<
          InferResponse<TEndpoints[K]>,
          EndpointParams<TEndpoints[K]>,
          number
        >
      : never;
};

/**
 * A GET endpoint exposed as an infinite-query-options factory.
 *
 * The pagination contract (`initialPageParam` + `getNextPageParam` + `pageParam`)
 * is declared once in `createQueries({ infinite })`; each call may partially
 * override it. If no config was declared for the endpoint, the full contract
 * must be supplied at the call site (otherwise it throws at runtime). Page param
 * is typed as `number` — for cursor pagination, cast at the call site.
 */
export interface InfiniteAccessor<TParams, TPage> {
  (
    params?: TParams,
    options?: Partial<InfiniteAccessorOptions<TPage, TParams, number>>,
  ): InfiniteAccessorResult<TPage, number>;
  queryKey: (params?: TParams) => QueryKey;
}

/**
 * A GET endpoint exposed as a query-options factory.
 *
 * `TFlatten` controls only the *call* params: when `true`, the accessor accepts
 * the flattened request shape ({@link Safe}). The `.queryKey()` helper and
 * `.infinite` always stay on the envelope params, so SSR/CSR keys match.
 */
export type QueryAccessor<TParams, TData, TFlatten extends boolean = false> =
  (ParamsOptional<ApplyFlatten<TParams, TFlatten>> extends true
    ? (
        params?: ApplyFlatten<TParams, TFlatten>,
        options?: QueryAccessorOptions<TData>,
      ) => QueryAccessorResult<TData>
    : (
        params: ApplyFlatten<TParams, TFlatten>,
        options?: QueryAccessorOptions<TData>,
      ) => QueryAccessorResult<TData>) & {
    queryKey: (params?: TParams) => DataTag<QueryKey, TData, DefaultError>;
    /** Infinite-query variant. Declare the contract via `createQueries({ infinite })`. */
    infinite: InfiniteAccessor<TParams, TData>;
  };

/** Mutation options plus the declarative `invalidates` sugar. */
export type RoutarMutationOptions<TData, TVars> = Omit<
  UseMutationOptions<TData, DefaultError, TVars>,
  "mutationFn" | "mutationKey"
> & { invalidates?: QueryKey[] };

/**
 * A non-GET endpoint exposed as a mutation-options factory.
 *
 * `TFlatten` controls only the mutation *vars*: when `true`, `mutate` accepts the
 * flattened request shape ({@link Safe}). `.mutationKey` is unaffected.
 */
export type MutationAccessor<TVars, TData, TFlatten extends boolean = false> = ((
  options?: RoutarMutationOptions<TData, ApplyFlatten<TVars, TFlatten>>,
) => UseMutationOptions<TData, DefaultError, ApplyFlatten<TVars, TFlatten>>) & {
  mutationKey: QueryKey;
};

/**
 * Recursively maps a router's endpoints to query/mutation accessors. `TFlatten`
 * flows down so flat-mode call signatures apply at every nesting level.
 */
export type Queries<
  TEndpoints extends RouterEndpoints,
  TFlatten extends boolean = false,
> = {
  [K in keyof TEndpoints]: TEndpoints[K] extends RouterDef<infer Nested>
    ? Queries<Nested, TFlatten>
    : TEndpoints[K] extends EndpointSpec<any, any, any>
      ? TEndpoints[K]["method"] extends "GET"
        ? QueryAccessor<
            EndpointParams<TEndpoints[K]>,
            InferResponse<TEndpoints[K]>,
            TFlatten
          >
        : MutationAccessor<
            EndpointParams<TEndpoints[K]>,
            InferResponse<TEndpoints[K]>,
            TFlatten
          >
      : never;
} & { $key: QueryKey };
