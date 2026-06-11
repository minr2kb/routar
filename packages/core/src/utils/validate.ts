import type { StandardSchemaV1 } from "../standard-schema.js";

export class ValidationError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ValidationError";
    if (cause !== undefined) {
      Object.defineProperty(this, "cause", {
        value: cause,
        writable: false,
        enumerable: false,
        configurable: true,
      });
    }
  }
}

/**
 * Thrown internally when a Standard Schema validator (`~standard.validate`)
 * reports issues. It is wrapped as the `cause` of a {@link ValidationError} by
 * the API client, mirroring how a thrown `.parse()` error becomes the cause —
 * so callers branch on `ValidationError` regardless of the validator library.
 * The structured `issues` array is preserved for drift reporting.
 */
export class StandardSchemaError extends Error {
  readonly issues: ReadonlyArray<StandardSchemaV1.Issue>;

  constructor(issues: ReadonlyArray<StandardSchemaV1.Issue>) {
    super(
      issues.map((issue) => issue.message).join("; ") ||
        "Standard Schema validation failed",
    );
    this.name = "StandardSchemaError";
    this.issues = issues;
  }
}
