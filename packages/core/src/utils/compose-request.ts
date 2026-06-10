import type { StandardSchemaV1 } from "../standard-schema.js";
import type { AnyValidator, RequestShape, Validator } from "../types.js";

/** The per-bucket validators of the SE-12 separated endpoint form. */
export interface RequestBuckets {
  path?: AnyValidator;
  query?: AnyValidator;
  body?: AnyValidator;
}

/**
 * The synthesized envelope request validator produced from separated buckets.
 * Carries a Zod-like `shape` (`{ path?, query?, body? }`) so `@routar/react-query`'s
 * flatten support can still introspect each bucket's keys via duck-typing — the
 * bucket form is indistinguishable from the envelope form downstream.
 */
export type ComposedRequest = AnyValidator<RequestShape> & {
  shape: Record<string, AnyValidator>;
};

const BUCKET_KEYS = ["path", "query", "body"] as const;

function hasParse(v: AnyValidator): v is Validator<unknown> {
  return typeof (v as Validator<unknown>).parse === "function";
}

/** Validates one bucket, returning a Standard-Schema-style result. */
async function validateBucket(
  validator: AnyValidator,
  value: unknown,
): Promise<StandardSchemaV1.Result<unknown>> {
  if (hasParse(validator)) {
    try {
      return { value: validator.parse(value) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { issues: [{ message }] };
    }
  }
  return (validator as StandardSchemaV1)["~standard"].validate(value);
}

/**
 * Composes separated `{ pathParams, query, body }` validators into a single
 * envelope request validator equivalent to
 * `z.object({ path, query, body })` — the shape the rest of the pipeline
 * (createApi, react-query) already understands.
 *
 * When every bucket exposes `.parse`, a synchronous `.parse` is provided so the
 * common (Zod/Valibot/Yup) path keeps its native error richness. Otherwise a
 * Standard Schema `~standard` validator is provided, aggregating each bucket's
 * issues under its bucket key.
 */
export function composeRequest(buckets: RequestBuckets): ComposedRequest {
  const entries = BUCKET_KEYS.filter(
    (k) => buckets[k] !== undefined,
  ).map((k) => [k, buckets[k] as AnyValidator] as const);

  const shape: Record<string, AnyValidator> = {};
  for (const [k, v] of entries) shape[k] = v;

  const standard: StandardSchemaV1<unknown, RequestShape> = {
    "~standard": {
      version: 1,
      vendor: "routar",
      validate: async (data: unknown) => {
        const input = (data ?? {}) as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        const issues: StandardSchemaV1.Issue[] = [];
        for (const [k, v] of entries) {
          const result = await validateBucket(v, input[k]);
          if (result.issues) {
            for (const issue of result.issues) {
              issues.push({ message: issue.message, path: [k, ...(issue.path ?? [])] });
            }
          } else {
            out[k] = result.value;
          }
        }
        return issues.length > 0
          ? { issues }
          : { value: out as RequestShape };
      },
    },
  };

  if (entries.every(([, v]) => hasParse(v))) {
    const parse = (data: unknown): RequestShape => {
      const input = (data ?? {}) as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of entries) {
        out[k] = (v as Validator<unknown>).parse(input[k]);
      }
      return out as RequestShape;
    };
    return Object.assign(standard, { parse, shape });
  }

  return Object.assign(standard, { shape });
}
