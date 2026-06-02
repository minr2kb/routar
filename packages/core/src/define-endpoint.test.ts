import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { endpoint } from "./index.js";

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

describe("endpoint() literal method", () => {
  it("preserves the literal method type", () => {
    const e = endpoint({
      method: "GET",
      path: "/",
      response: z.object({ id: z.number() }),
    });
    // Type-level: method must be the literal "GET", not the widened HttpMethod union.
    type _check = Expect<Equal<typeof e.method, "GET">>;
    // Runtime: value is passed through unchanged.
    expect(e.method).toBe("GET");
  });

  it("preserves literal method with request + adapter overload", () => {
    const e = endpoint({
      method: "POST",
      path: "/",
      request: z.object({ body: z.object({ title: z.string() }) }),
      response: z.object({ id: z.number() }),
      adapter: (raw) => raw.id,
    });
    type _check = Expect<Equal<typeof e.method, "POST">>;
    expect(e.method).toBe("POST");
  });
});
