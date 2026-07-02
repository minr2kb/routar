import type { StandardSchemaV1 } from "../standard-schema.js";
import type {
  AnyValidator,
  EndpointSpec,
  RequestShape,
  Validator,
  ValidatorOutput,
} from "../types.js";
import { StandardSchemaError } from "./validate.js";

/**
 * Validates `data` with an {@link AnyValidator}, returning the parsed value.
 *
 * Prefers the synchronous `.parse()` path when present (Zod, Valibot, Yup, or
 * any object with `.parse()`); a thrown parse error propagates unchanged.
 * Otherwise uses the Standard Schema `~standard.validate` path (sync or async);
 * reported issues are thrown as a {@link StandardSchemaError}.
 *
 * Exported for executor / mock-handler authors who need routar's exact
 * validate-or-throw semantics for both validator styles.
 */
export async function runValidator(
  validator: AnyValidator,
  data: unknown,
): Promise<unknown> {
  if (typeof (validator as Validator<unknown>).parse === "function") {
    return (validator as Validator<unknown>).parse(data);
  }
  const standard = (validator as StandardSchemaV1)["~standard"];
  const result = await standard.validate(data);
  if (result.issues) throw new StandardSchemaError(result.issues);
  return result.value;
}

/**
 * Return type of {@link createParser}. `parseResponse` is always present;
 * `parseRequest` exists only when the spec declares a `request` validator.
 *
 * The `TSpec["request"] extends AnyValidator<infer R>` branch relies on the
 * spec's `request` being a required, non-`undefined` field — which is exactly
 * what {@link endpoint} guarantees in its return type. See {@link createParser}.
 */
type Parser<TSpec extends EndpointSpec<any, any, any>> = {
  parseResponse: (raw: unknown) => Promise<ValidatorOutput<TSpec["response"]>>;
} & (TSpec["request"] extends AnyValidator<infer R>
  ? { parseRequest: (raw: RequestShape) => Promise<R> }
  : Record<string, never>);

/**
 * Builds framework-agnostic, validate-or-throw parsers from an endpoint spec —
 * the server-side counterpart to `createApi`'s client-side validation.
 *
 * Returns `{ parseResponse }` (always) plus `{ parseRequest }` when the spec has
 * a `request` validator. Both delegate to {@link runValidator}: valid input
 * resolves to the parsed value, invalid input **throws the original error**
 * (Zod `ZodError` or {@link StandardSchemaError}) unchanged.
 *
 * No HTTP concerns: there is no status-code mapping or error formatting here —
 * turning a thrown error into a 400/422 response is the calling app's job, so
 * this works under any server framework (Next.js Route Handlers, Hono, Express…).
 * Assemble the request envelope yourself, e.g.
 * `parseRequest({ path: params, query, body: await req.json() })`.
 *
 * **Pass a spec created by {@link endpoint}.** The conditional `parseRequest`
 * relies on `endpoint()`'s return type, where `request` is a required (non-
 * `undefined`) field. Hand-annotating a spec as `EndpointSpec` makes `request`
 * optional (`| undefined`), so `parseRequest` silently drops out of the type
 * (though it still runs) — the same `endpoint()`-return-type contract `createApi`
 * already depends on.
 *
 * `parseResponse` validates against the pure `response` schema and does **not**
 * apply the `adapter` — its output is `ValidatorOutput<TSpec["response"]>`, not
 * `InferResponse<TSpec>` (adapter is client-side post-processing).
 */
export function createParser<TSpec extends EndpointSpec<any, any, any>>(
  spec: TSpec,
): Parser<TSpec> {
  const parseResponse = (raw: unknown) =>
    runValidator(spec.response, raw) as Promise<
      ValidatorOutput<TSpec["response"]>
    >;

  // The conditional return type depends on whether `spec.request` exists, which
  // a runtime `if` cannot prove to the compiler — so we assert the concrete
  // `Parser<TSpec>` here (a specific type, not `any`).
  if (!spec.request) return { parseResponse } as Parser<TSpec>;
  const parseRequest = (raw: RequestShape) =>
    runValidator(spec.request as AnyValidator, raw);
  // Same reason: `spec.request` presence decides the type. `runValidator`
  // returns `Promise<unknown>`, which `as` alone won't narrow to `Promise<R>`
  // (function return types don't structurally overlap) — the `unknown` hop
  // asserts the concrete `Parser<TSpec>` target (still a specific type, not `any`).
  return { parseRequest, parseResponse } as unknown as Parser<TSpec>;
}
