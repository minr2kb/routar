import type {
  AnyValidator,
  HttpMethod,
  Validator,
  ValidatorOutput,
} from "./types.js";
import { composeRequest } from "./utils/compose-request.js";
import type { RequestBuckets } from "./utils/compose-request.js";

/**
 * Extracts `:param` segment names from a path template string as a union of
 * string literals.
 *
 * @example
 * ```ts
 * type P = PathParams<'/:userId/posts/:postId'>; // 'userId' | 'postId'
 * ```
 */
export type PathParams<TPath extends string> =
  TPath extends `${string}:${infer Param}/${infer Rest}`
    ? Param | PathParams<Rest>
    : TPath extends `${string}:${infer Param}`
      ? Param
      : never;

/**
 * Wraps a single bucket key in an object type, marking it optional when the
 * bucket validator's output includes `undefined` (i.e. the validator is
 * `.optional()`). This preserves the legacy envelope behavior where
 * `z.object({ query: z.object(...).optional() })` produced `{ query?: ... }`,
 * so an all-optional request still makes the call params optional downstream.
 */
type BucketKey<TKey extends string, TValidator> =
  undefined extends ValidatorOutput<TValidator>
    ? { [K in TKey]?: ValidatorOutput<TValidator> }
    : { [K in TKey]: ValidatorOutput<TValidator> };

/**
 * Builds the envelope request output type from the separated bucket
 * validators. Each bucket contributes its key only when supplied — the tuple
 * wrapping (`[T] extends [never]`) prevents the `never` default from
 * distributing and collapsing the whole intersection. A bucket whose validator
 * is `.optional()` contributes an optional key (see {@link BucketKey}).
 */
type BucketRequestOutput<TPathParams, TQuery, TBody> = ([
  TPathParams,
] extends [never]
  ? {}
  : BucketKey<"path", TPathParams>) &
  ([TQuery] extends [never] ? {} : BucketKey<"query", TQuery>) &
  ([TBody] extends [never] ? {} : BucketKey<"body", TBody>);

/**
 * The `request` bucket-map of the separated form: `{ path?, query?, body? }`
 * where each value is its own validator (instead of a wrapped
 * `z.object({ path, query, body })` envelope). The `path` key is required when
 * `TPath` has dynamic segments, optional otherwise — its validator is further
 * constrained (at the generic level) to cover every `:param` name.
 */
type BucketRequestMap<TPath extends string, TPathParams, TQuery, TBody> = ([
  PathParams<TPath>,
] extends [never]
  ? { path?: TPathParams }
  : { path: TPathParams }) & {
  query?: TQuery;
  body?: TBody;
};

/**
 * Rejects the legacy top-level separated-bucket fields. Those buckets now live
 * inside `request` (`{ path, query, body }`); a stray top-level `pathParams` /
 * `query` / `body` would otherwise be silently dropped (no validation), so this
 * intersection turns the removed form into a compile error instead.
 */
type NoLegacyBuckets = { pathParams?: never; query?: never; body?: never };

/**
 * Type-safe endpoint definition helper.
 *
 * Use this instead of a plain object literal to get full type inference on
 * `adapter` without requiring explicit annotations or `as any` casts.
 *
 * `request` is a `{ path?, query?, body? }` map of standalone validators (each
 * any object with `.parse()` or a Standard Schema). routar composes the buckets
 * into a single envelope validator internally. Omit `request` entirely for
 * endpoints that take no parameters.
 *
 * When `path` contains dynamic segments (e.g. `'/:id'`), TypeScript enforces
 * that `request.path` includes a matching field for those param names. A
 * mismatch or missing key is a compile-time error.
 *
 * The literal HTTP method (`'GET'`, `'POST'`, …) is preserved on the return
 * type — `endpoint({ method: 'GET', ... }).method` is typed `'GET'`, not the
 * `HttpMethod` union.
 *
 * @example Basic GET with no params
 * ```ts
 * const getList = endpoint({ method: 'GET', path: '/', response: z.array(TodoSchema) });
 * ```
 *
 * @example GET with query params
 * ```ts
 * const search = endpoint({
 *   method: 'GET',
 *   path: '/search',
 *   request: { query: z.object({ q: z.string(), limit: z.number().optional() }) },
 *   response: z.array(TodoSchema),
 * });
 * ```
 *
 * @example POST with body
 * ```ts
 * const create = endpoint({
 *   method: 'POST',
 *   path: '/',
 *   request: { body: z.object({ title: z.string() }) },
 *   response: TodoSchema,
 * });
 * ```
 *
 * @example Adapter — raw is inferred from the response schema, no cast needed
 * ```ts
 * const getDetail = endpoint({
 *   method: 'GET',
 *   path: '/:id',
 *   request: { path: z.object({ id: z.number() }) },
 *   response: TodoRawSchema,
 *   adapter: (raw) => ({ ...raw, label: `#${raw.id} ${raw.title}` }),
 * });
 * ```
 *
 * @example Path param enforcement
 * ```ts
 * // ✅ path has ':id' → request.path.id is required
 * const getDetail = endpoint({
 *   method: 'GET',
 *   path: '/:id',
 *   request: { path: z.object({ id: z.number() }) },
 *   response: TodoSchema,
 * });
 *
 * // ❌ compile error — request.path is missing for ':id'
 * const broken = endpoint({
 *   method: 'GET',
 *   path: '/:id',
 *   request: { query: z.object({ foo: z.string() }) },
 *   response: TodoSchema,
 * });
 * ```
 */
// no request + adapter O
export function endpoint<
  TMethod extends HttpMethod,
  TResponse extends AnyValidator,
  TOut,
>(spec: {
  method: TMethod;
  path: string;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
} & NoLegacyBuckets): {
  method: TMethod;
  path: string;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
};

// no request + adapter X
export function endpoint<
  TMethod extends HttpMethod,
  TResponse extends AnyValidator,
>(spec: {
  method: TMethod;
  path: string;
  response: TResponse;
} & NoLegacyBuckets): {
  method: TMethod;
  path: string;
  response: TResponse;
};

// ─────────────────────────────────────────────────────────────────────────
// `request` as a `{ path?, query?, body? }` bucket-map of standalone validators:
//
//   endpoint({
//     method: 'GET', path: '/:id',
//     request: {
//       path: z.object({ id: z.number() }),
//       query: z.object({ q: z.string() }),
//     },
//     response: TodoSchema,
//   })
//
// Internally the buckets are composed into a single envelope request validator,
// so query keys, react-query flatten, and MSW all read the canonical shape.
// ─────────────────────────────────────────────────────────────────────────

// request bucket-map + adapter O
export function endpoint<
  TMethod extends HttpMethod,
  TPath extends string,
  TResponse extends AnyValidator,
  TOut,
  TPathParams extends AnyValidator<Record<PathParams<TPath>, unknown>> = never,
  TQuery extends AnyValidator = never,
  TBody extends AnyValidator = never,
>(spec: {
  method: TMethod;
  path: TPath;
  request: BucketRequestMap<TPath, TPathParams, TQuery, TBody>;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
}): {
  method: TMethod;
  path: string;
  request: Validator<BucketRequestOutput<TPathParams, TQuery, TBody>>;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
};

// request bucket-map + adapter X
export function endpoint<
  TMethod extends HttpMethod,
  TPath extends string,
  TResponse extends AnyValidator,
  TPathParams extends AnyValidator<Record<PathParams<TPath>, unknown>> = never,
  TQuery extends AnyValidator = never,
  TBody extends AnyValidator = never,
>(spec: {
  method: TMethod;
  path: TPath;
  request: BucketRequestMap<TPath, TPathParams, TQuery, TBody>;
  response: TResponse;
}): {
  method: TMethod;
  path: string;
  request: Validator<BucketRequestOutput<TPathParams, TQuery, TBody>>;
  response: TResponse;
};

export function endpoint(spec: Record<string, unknown>): unknown {
  // `request` is a `{ path?, query?, body? }` bucket-map — compose it into the
  // canonical envelope `request` validator that the rest of the pipeline
  // (createApi, react-query, MSW) consumes.
  const req = spec.request;
  if (req !== undefined) {
    const { path, query, body } = req as RequestBuckets;
    return { ...spec, request: composeRequest({ path, query, body }) };
  }
  return spec;
}
