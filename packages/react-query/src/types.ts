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
 * Extracts a bucket's value type from `R`, stripping `undefined`. Returns
 * `never` when the bucket key is absent. This handles both required
 * (`{ query: T }`) and optional (`{ query?: T }`) bucket shapes from
 * {@link BucketKey} without relying on `R extends { query: infer Q }`, which
 * only matches *required* properties and silently returns `{}` for optional
 * ones.
 */
type GetBucket<R, K extends string> = NonNullable<K extends keyof R ? R[K] : never>;

/**
 * Maps a bucket value to its object form for spreading into the flat shape:
 * - `never` (absent bucket) → `{}`
 * - non-object scalar (e.g. array, string) → `{}` (can't be spread)
 * - object type → the object itself
 */
type BucketFlat<T> = [T] extends [never] ? {} : T extends object ? T : {};

/**
 * Flattens the three request buckets into a single object type. A non-object
 * `body` (e.g. `z.array`/`z.string`) contributes `{}` here and is separately
 * blocked from flattening by {@link BodyFlattenable}. The intersections with
 * `{}` are intentional — an absent bucket should contribute nothing to the
 * merged shape.
 *
 * Uses {@link GetBucket} instead of `R extends { query: infer Q }` so that
 * optional bucket properties (`{ query?: T }` produced by `.optional()` Zod
 * schemas) are correctly included — the `infer` pattern only matches required
 * properties and would silently drop optional query/path fields.
 */
export type Flatten<R extends Envelope> =
  BucketFlat<GetBucket<R, "path">> &
  BucketFlat<GetBucket<R, "query">> &
  BucketFlat<GetBucket<R, "body">>;

type KeysOf<T> = T extends object ? keyof T : never;
type PathK<R> = KeysOf<GetBucket<R, "path">>;
type QueryK<R> = KeysOf<GetBucket<R, "query">>;
type BodyK<R> = GetBucket<R, "body"> extends object
  ? KeysOf<GetBucket<R, "body">>
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
export type BodyFlattenable<R extends Envelope> = [GetBucket<R, "body">] extends [never]
  ? true
  : GetBucket<R, "body"> extends object
    ? GetBucket<R, "body"> extends readonly unknown[]
      ? false
      : true
    : false;

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

/**
 * Marks non-GET endpoints to expose as **query** accessors instead of mutation
 * accessors (SE-9). The common case is a POST search/filter endpoint that is
 * semantically a read: it belongs in `useSuspenseQuery` and benefits from query
 * key caching (the request body is part of the key, like any param).
 *
 * The map mirrors the router shape (like `infinite`/`defaults`): set an
 * endpoint's value to `true`, and nest for sub-routers. GET endpoints are
 * already queries and are excluded from the map.
 */
export type QueryEndpointsMap<TEndpoints extends RouterEndpoints> = {
  [K in keyof TEndpoints as TEndpoints[K] extends RouterDef<any>
    ? K
    : TEndpoints[K] extends EndpointSpec<any, any, any>
      ? TEndpoints[K]["method"] extends "GET"
        ? never
        : K
      : never]?: TEndpoints[K] extends RouterDef<infer Nested>
    ? QueryEndpointsMap<Nested>
    : true;
};

/** True when endpoint `K` is marked as a query override in `TQO`. */
export type IsQueryOverride<TQO, K extends PropertyKey> = TQO extends object
  ? K extends keyof TQO
    ? TQO[K] extends true
      ? true
      : false
    : false
  : false;

/** The override sub-map for a nested router key `K`. */
type QueryOverrideChild<TQO, K extends PropertyKey> = TQO extends object
  ? K extends keyof TQO
    ? TQO[K]
    : {}
  : {};

/** True when endpoint spec `TSpec` (named `K`) should be a query accessor. */
type IsQuery<TSpec, TQO, K extends PropertyKey> = TSpec extends EndpointSpec<
  any,
  any,
  any
>
  ? TSpec["method"] extends "GET"
    ? true
    : IsQueryOverride<TQO, K>
  : false;

/** Options accepted by createQueries. */
export interface CreateQueriesOptions<
  TEndpoints extends RouterEndpoints = RouterEndpoints,
  TFlatten extends boolean = false,
  TQO = {},
> {
  /** Overrides the root key segment(s); defaults to the router prefix segments. */
  key?: string;
  /** Per-endpoint default options merged before each call's options. */
  defaults?: EndpointDefaults<TEndpoints, Queries<TEndpoints, TFlatten, TQO>>;
  /**
   * Per-endpoint infinite (pagination) contract, keyed by GET endpoint name (or
   * a non-GET endpoint promoted via {@link CreateQueriesOptions.queryEndpoints}).
   * Declared once here; each `.infinite()` call may override it. See
   * {@link InfiniteConfigMap}.
   */
  infinite?: InfiniteConfigMap<TEndpoints, TQO>;
  /**
   * Promote non-GET endpoints to query accessors (SE-9) — e.g. a POST search
   * that is semantically a read. Mirrors the router shape. See
   * {@link QueryEndpointsMap}. Inferred as a `const` type parameter by
   * {@link createQueries}, so nested `true` literals are preserved; the value's
   * shape is validated against {@link QueryEndpointsMap} via that generic
   * constraint.
   */
  queryEndpoints?: TQO;
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
export type InfiniteConfigMap<TEndpoints extends RouterEndpoints, TQO = {}> = {
  // Keep query endpoints (GET, or non-GET promoted via `queryEndpoints`) and
  // nested routers (recursed); drop plain mutation endpoints.
  [K in keyof TEndpoints as TEndpoints[K] extends RouterDef<any>
    ? K
    : TEndpoints[K] extends EndpointSpec<any, any, any>
      ? IsQuery<TEndpoints[K], TQO, K> extends true
        ? K
        : never
      : never]?: TEndpoints[K] extends RouterDef<infer Nested>
    ? InfiniteConfigMap<Nested, QueryOverrideChild<TQO, K>>
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
  TQO = {},
> = {
  [K in keyof TEndpoints]: TEndpoints[K] extends RouterDef<infer Nested>
    ? Queries<Nested, TFlatten, QueryOverrideChild<TQO, K>>
    : TEndpoints[K] extends EndpointSpec<any, any, any>
      ? IsQuery<TEndpoints[K], TQO, K> extends true
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
