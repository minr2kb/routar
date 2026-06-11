import type { StandardSchemaV1 } from "../standard-schema.js";
import type { AnyValidator, Validator } from "../types.js";
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
