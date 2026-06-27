/**
 * Runtime support for the `flatten` option of `createQueries`.
 *
 * When `flatten` is enabled, callers pass the union of the `path`/`query`/`body`
 * fields directly (`getDetail({ id })`) instead of the nested envelope
 * (`getDetail({ path: { id } })`). At accessor-build time we capture which keys
 * belong to which bucket by reading the endpoint's Zod request schema, then
 * re-assemble the flat object into a `{ path, query, body }` envelope before
 * calling the api client. The query key is *always* built from the envelope, so
 * flat and envelope call styles converge on the same key.
 */

/** The three request buckets and the own keys captured for each. */
export interface BucketMap {
  path: string[];
  query: string[];
  body: string[];
  /**
   * `false` when the request can't be safely flattened — a key appears in more
   * than one bucket (ambiguous), or `body` isn't a plain object schema (e.g.
   * `z.array`/`z.string`, whose fields can't be spread into the flat object).
   */
  flattenable: boolean;
}

/**
 * A Zod-like object schema: exposes a `.shape` record of field name → sub-schema.
 * We read it via duck-typing because `@routar/core` types `request` only as a
 * `Validator` (`.parse`), but the value handed to `endpoint()` is a real Zod
 * object whose `.shape` exists at runtime — reading it keeps the core contract
 * untouched.
 */
interface ShapeCarrier {
  shape: Record<string, unknown>;
}

/**
 * Duck-typed interface for wrapper schemas that expose their inner schema via
 * `.unwrap()` — covers `ZodOptional`, `ZodNullable`, and any schema following
 * the same convention. We call `.unwrap()` so that a bucket declared as
 * `z.object({…}).optional()` still yields its inner shape instead of returning
 * `null` (because `ZodOptional` itself has no `.shape`).
 */
interface Unwrappable {
  unwrap(): unknown;
}

function getShape(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  const shape = (value as Partial<ShapeCarrier>).shape;
  if (typeof shape === "object" && shape !== null) {
    return shape as Record<string, unknown>;
  }
  // Wrapped schema (ZodOptional, ZodNullable, …) — unwrap and retry.
  const unwrap = (value as Partial<Unwrappable>).unwrap;
  if (typeof unwrap === "function") {
    return getShape(unwrap.call(value));
  }
  return null;
}

/**
 * Inspects an endpoint's Zod `request` schema and records the own keys of each
 * `{ path, query, body }` bucket. Returns `null` when the request has no usable
 * object shape at all (no flattening possible — treat as identity). When a
 * bucket exists but `body` isn't an object schema, or a key collides across
 * buckets, `flattenable` is set to `false` so the caller falls back to the
 * envelope passthrough.
 */
export function captureBuckets(request: unknown): BucketMap | null {
  const requestShape = getShape(request);
  if (requestShape === null) return null;

  const path = collectKeys(requestShape.path);
  const query = collectKeys(requestShape.query);

  let body: string[] = [];
  let bodyOk = true;
  if ("body" in requestShape) {
    const bodyShape = getShape(requestShape.body);
    if (bodyShape === null) {
      // body present but not a plain object schema (z.array/z.string/…) — its
      // fields can't be spread into a flat object, so flattening is unsafe.
      bodyOk = false;
    } else {
      body = Object.keys(bodyShape);
    }
  }

  const flattenable = bodyOk && !hasCollision(path, query, body);
  return { path, query, body, flattenable };
}

/** Returns the own keys of a Zod object sub-schema, or `[]` if it isn't one. */
function collectKeys(bucket: unknown): string[] {
  const shape = getShape(bucket);
  return shape === null ? [] : Object.keys(shape);
}

/** True when any key appears in more than one of the three buckets. */
function hasCollision(path: string[], query: string[], body: string[]): boolean {
  const seen = new Set<string>();
  for (const key of [...path, ...query, ...body]) {
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

/**
 * Re-assembles flat params into a `{ path, query, body }` envelope using the
 * captured buckets. Each bucket field is included only when at least one of its
 * keys is present in `flat`, so empty buckets are omitted (no empty `path: {}`).
 * If `flat` isn't a plain object, it's returned unchanged.
 */
export function toEnvelope(flat: unknown, buckets: BucketMap): unknown {
  if (typeof flat !== "object" || flat === null || Array.isArray(flat)) {
    return flat;
  }
  const source = flat as Record<string, unknown>;
  const envelope: { path?: object; query?: object; body?: object } = {};

  const path = pick(source, buckets.path);
  if (path !== null) envelope.path = path;
  const query = pick(source, buckets.query);
  if (query !== null) envelope.query = query;
  const body = pick(source, buckets.body);
  if (body !== null) envelope.body = body;

  return envelope;
}

/**
 * Picks the given keys out of `source`. Returns `null` when none of the keys are
 * present, so the caller can omit the bucket entirely.
 */
function pick(
  source: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> | null {
  let picked: Record<string, unknown> | null = null;
  for (const key of keys) {
    if (key in source) {
      picked ??= {};
      picked[key] = source[key];
    }
  }
  return picked;
}
