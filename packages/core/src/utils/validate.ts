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
