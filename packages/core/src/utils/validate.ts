export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
    if (cause !== undefined) {
      Object.defineProperty(this, "cause", {
        value: cause,
        writable: true,
        enumerable: true,
      });
    }
  }
}
