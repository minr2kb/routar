import type {
  HttpMethod,
  RequestShape,
  Validator,
  ValidatorOutput,
} from "./types.js";

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
  TPath extends string,
  TRequest extends RequestShape & PathConstraint<TPath>,
  TResponse extends Validator<unknown>,
  TOut,
>(spec: {
  method: HttpMethod;
  path: TPath;
  request: Validator<TRequest>;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
}): {
  method: HttpMethod;
  path: string;
  request: Validator<TRequest>;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
};

// request O + adapter X
export function endpoint<
  TPath extends string,
  TRequest extends RequestShape & PathConstraint<TPath>,
  TResponse extends Validator<unknown>,
>(spec: {
  method: HttpMethod;
  path: TPath;
  request: Validator<TRequest>;
  response: TResponse;
}): {
  method: HttpMethod;
  path: string;
  request: Validator<TRequest>;
  response: TResponse;
};

// request X + adapter O
export function endpoint<TResponse extends Validator<unknown>, TOut>(spec: {
  method: HttpMethod;
  path: string;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
}): {
  method: HttpMethod;
  path: string;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
};

// request X + adapter X
export function endpoint<TResponse extends Validator<unknown>>(spec: {
  method: HttpMethod;
  path: string;
  response: TResponse;
}): {
  method: HttpMethod;
  path: string;
  response: TResponse;
};

export function endpoint(spec: unknown): unknown {
  return spec;
}
