import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { endpoint } from "./index.js";

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

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
      request: { body: z.object({ title: z.string() }) },
      response: z.object({ id: z.number() }),
      adapter: (raw) => raw.id,
    });
    type _check = Expect<Equal<typeof e.method, "POST">>;
    expect(e.method).toBe("POST");
  });

  it("preserves literal method with request-only overload", () => {
    const e = endpoint({
      method: "PATCH",
      path: "/",
      request: { body: z.object({ done: z.boolean() }) },
      response: z.object({ id: z.number() }),
    });
    type _check = Expect<Equal<typeof e.method, "PATCH">>;
    expect(e.method).toBe("PATCH");
  });

  it("preserves literal method with adapter-only overload", () => {
    const e = endpoint({
      method: "DELETE",
      path: "/",
      response: z.object({ id: z.number() }),
      adapter: (raw) => raw.id,
    });
    type _check = Expect<Equal<typeof e.method, "DELETE">>;
    expect(e.method).toBe("DELETE");
  });
});

describe("endpoint() separated request buckets (SE-12)", () => {
  it("composes request.{path,query} into an envelope request validator", () => {
    const e = endpoint({
      method: "GET",
      path: "/:id",
      request: {
        path: z.object({ id: z.number() }),
        query: z.object({ q: z.string() }),
      },
      response: z.object({ id: z.number() }),
    });
    type _method = Expect<Equal<typeof e.method, "GET">>;
    // The synthesized request parses into the canonical envelope shape.
    const parsed = e.request.parse({ path: { id: 1 }, query: { q: "x" } });
    expect(parsed).toEqual({ path: { id: 1 }, query: { q: "x" } });
  });

  it("infers the envelope request type from the buckets", () => {
    const e = endpoint({
      method: "POST",
      path: "/:id",
      request: {
        path: z.object({ id: z.number() }),
        body: z.object({ title: z.string() }),
      },
      response: z.object({ ok: z.boolean() }),
    });
    type Req = ReturnType<typeof e.request.parse>;
    // Structural round-trip: the envelope carries exactly path + body.
    const value: Req = { path: { id: 1 }, body: { title: "x" } };
    const back: { path: { id: number }; body: { title: string } } = value;
    expect(back.path.id).toBe(1);
    expect(e.method).toBe("POST");
  });

  it("exposes a Zod-like shape for react-query flatten introspection", () => {
    const e = endpoint({
      method: "GET",
      path: "/:id",
      request: {
        path: z.object({ id: z.number() }),
        query: z.object({ q: z.string() }),
      },
      response: z.object({ id: z.number() }),
    });
    const shape = (e.request as unknown as { shape: Record<string, unknown> })
      .shape;
    expect(Object.keys(shape).sort()).toEqual(["path", "query"]);
  });

  it("throws when a bucket fails validation", () => {
    const e = endpoint({
      method: "GET",
      path: "/:id",
      request: { path: z.object({ id: z.number() }) },
      response: z.object({ id: z.number() }),
    });
    expect(() => e.request.parse({ path: { id: "nope" } })).toThrow();
  });

  it("@ts-expect-error — request.path required when path has :param", () => {
    endpoint({
      method: "GET",
      path: "/:id",
      // @ts-expect-error missing request.path for ':id'
      request: { query: z.object({ q: z.string() }) },
      response: z.object({ id: z.number() }),
    });
    expect(true).toBe(true);
  });

  it("@ts-expect-error — pre-2.0 top-level buckets are rejected (not silently dropped)", () => {
    endpoint({
      method: "GET",
      path: "/:id",
      // @ts-expect-error top-level `pathParams` removed — use request: { path }
      pathParams: z.object({ id: z.number() }),
      response: z.object({ id: z.number() }),
    });
    endpoint({
      method: "POST",
      path: "/",
      // @ts-expect-error top-level `body` removed — use request: { body }
      body: z.object({ title: z.string() }),
      response: z.object({ id: z.number() }),
    });
    expect(true).toBe(true);
  });
});
