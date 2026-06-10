import type {
  AnyValidator,
  HttpMethod,
  RequestShape,
  Validator,
  ValidatorOutput,
} from "./types.js";
import { composeRequest } from "./utils/compose-request.js";

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
 * When `TPath` contains dynamic segments (`:param`), requires `request.path`
 * to include all extracted param names. No constraint for static paths.
 */
type PathConstraint<TPath extends string> = [PathParams<TPath>] extends [never]
  ? {}
  : { path: Record<PathParams<TPath>, unknown> };

/**
 * Builds the envelope request output type from the SE-12 separated bucket
 * validators. Each bucket contributes its key only when supplied — the tuple
 * wrapping (`[T] extends [never]`) prevents the `never` default from
 * distributing and collapsing the whole intersection.
 */
type BucketRequestOutput<TPathParams, TQuery, TBody> = ([
  TPathParams,
] extends [never]
  ? {}
  : { path: ValidatorOutput<TPathParams> }) &
  ([TQuery] extends [never] ? {} : { query: ValidatorOutput<TQuery> }) &
  ([TBody] extends [never] ? {} : { body: ValidatorOutput<TBody> });

/**
 * The `pathParams` field of the separated form: required when `TPath` has
 * dynamic segments, optional otherwise. The validator type is further
 * constrained (at the generic level) to cover every `:param` name.
 */
type BucketPathField<TPath extends string, TPathParams> = [
  PathParams<TPath>,
] extends [never]
  ? { pathParams?: TPathParams }
  : { pathParams: TPathParams };

/**
 * Type-safe endpoint definition helper.
 *
 * Use this instead of a plain object literal to get full type inference on
 * `adapter` without requiring explicit annotations or `as any` casts.
 * The four overloads cover every combination of optional `request` validator
 * and optional `adapter` function while keeping all return-type fields
 * required so that TypeScript can narrow them downstream.
 *
 * When `path` contains dynamic segments (e.g. `'/:id'`), TypeScript enforces
 * that `request` includes a matching `path` field with those param names.
 * A mismatch or missing key is a compile-time error.
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
 *   request: z.object({ query: z.object({ q: z.string(), limit: z.number().optional() }) }),
 *   response: z.array(TodoSchema),
 * });
 * ```
 *
 * @example POST with body
 * ```ts
 * const create = endpoint({
 *   method: 'POST',
 *   path: '/',
 *   request: z.object({ body: z.object({ title: z.string() }) }),
 *   response: TodoSchema,
 * });
 * ```
 *
 * @example Adapter — raw is inferred from the response schema, no cast needed
 * ```ts
 * const getDetail = endpoint({
 *   method: 'GET',
 *   path: '/:id',
 *   request: z.object({ path: z.object({ id: z.number() }) }),
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
 *   request: z.object({ path: z.object({ id: z.number() }) }),
 *   response: TodoSchema,
 * });
 *
 * // ❌ compile error — 'id' is missing from request.path
 * const broken = endpoint({
 *   method: 'GET',
 *   path: '/:id',
 *   request: z.object({ query: z.object({ foo: z.string() }) }),
 *   response: TodoSchema,
 * });
 * ```
 */
// request O + adapter O
export function endpoint<
  TMethod extends HttpMethod,
  TPath extends string,
  TReq extends AnyValidator<RequestShape & PathConstraint<TPath>>,
  TResponse extends AnyValidator,
  TOut,
>(spec: {
  method: TMethod;
  path: TPath;
  request: TReq;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
}): {
  method: TMethod;
  path: string;
  request: TReq;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
};

// request O + adapter X
export function endpoint<
  TMethod extends HttpMethod,
  TPath extends string,
  TReq extends AnyValidator<RequestShape & PathConstraint<TPath>>,
  TResponse extends AnyValidator,
>(spec: {
  method: TMethod;
  path: TPath;
  request: TReq;
  response: TResponse;
}): {
  method: TMethod;
  path: string;
  request: TReq;
  response: TResponse;
};

// request X + adapter O
export function endpoint<
  TMethod extends HttpMethod,
  TResponse extends AnyValidator,
  TOut,
>(spec: {
  method: TMethod;
  path: string;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
}): {
  method: TMethod;
  path: string;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
};

// request X + adapter X
export function endpoint<
  TMethod extends HttpMethod,
  TResponse extends AnyValidator,
>(spec: {
  method: TMethod;
  path: string;
  response: TResponse;
}): {
  method: TMethod;
  path: string;
  response: TResponse;
};

// ─────────────────────────────────────────────────────────────────────────
// SE-12 — separated request buckets (additive; the envelope `request` form
// above keeps working unchanged). Declare each part on its own field instead of
// wrapping a `z.object({ path, query, body })` envelope:
//
//   endpoint({
//     method: 'GET', path: '/:id',
//     pathParams: z.object({ id: z.number() }),
//     query: z.object({ q: z.string() }),
//     response: TodoSchema,
//   })
//
// Internally the buckets are composed into the same envelope request validator,
// so call sites, keys, react-query flatten, and MSW all behave identically.
// ─────────────────────────────────────────────────────────────────────────

// separated buckets + adapter O
export function endpoint<
  TMethod extends HttpMethod,
  TPath extends string,
  TResponse extends AnyValidator,
  TOut,
  TPathParams extends AnyValidator<Record<PathParams<TPath>, unknown>> = never,
  TQuery extends AnyValidator = never,
  TBody extends AnyValidator = never,
>(
  spec: {
    method: TMethod;
    path: TPath;
    query?: TQuery;
    body?: TBody;
    response: TResponse;
    adapter: (raw: ValidatorOutput<TResponse>) => TOut;
  } & BucketPathField<TPath, TPathParams>,
): {
  method: TMethod;
  path: string;
  request: Validator<BucketRequestOutput<TPathParams, TQuery, TBody>>;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
};

// separated buckets + adapter X
export function endpoint<
  TMethod extends HttpMethod,
  TPath extends string,
  TResponse extends AnyValidator,
  TPathParams extends AnyValidator<Record<PathParams<TPath>, unknown>> = never,
  TQuery extends AnyValidator = never,
  TBody extends AnyValidator = never,
>(
  spec: {
    method: TMethod;
    path: TPath;
    query?: TQuery;
    body?: TBody;
    response: TResponse;
  } & BucketPathField<TPath, TPathParams>,
): {
  method: TMethod;
  path: string;
  request: Validator<BucketRequestOutput<TPathParams, TQuery, TBody>>;
  response: TResponse;
};

export function endpoint(spec: Record<string, unknown>): unknown {
  // Separated-bucket form (SE-12): normalize into the envelope `request`.
  if (
    spec.request === undefined &&
    (spec.pathParams !== undefined ||
      spec.query !== undefined ||
      spec.body !== undefined)
  ) {
    const { pathParams, query, body, ...rest } = spec;
    return {
      ...rest,
      request: composeRequest({
        path: pathParams as AnyValidator | undefined,
        query: query as AnyValidator | undefined,
        body: body as AnyValidator | undefined,
      }),
    };
  }
  return spec;
}
