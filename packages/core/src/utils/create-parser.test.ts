import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { endpoint } from "../define-endpoint.js";
import type { StandardSchemaV1 } from "../standard-schema.js";
import type { AnyValidator, EndpointSpec, RequestShape } from "../types.js";
import { createParser } from "./run-validator.js";
import { StandardSchemaError } from "./validate.js";

/** A minimal Standard Schema validator (no `.parse`, only `~standard`). */
const standardValidator = <T>(opts: {
  value?: T;
  issues?: { message: string }[];
}): StandardSchemaV1<unknown, T> => ({
  "~standard": {
    version: 1,
    vendor: "test",
    validate: (data: unknown) =>
      opts.issues ? { issues: opts.issues } : { value: (opts.value ?? data) as T },
  },
});

describe("createParser", () => {
  it("exposes parseRequest + parseResponse for a spec with request", async () => {
    const spec = endpoint({
      method: "POST",
      path: "/todos",
      request: { body: z.object({ title: z.string() }) },
      response: z.object({ id: z.number() }),
    });
    const parser = createParser(spec);

    expect("parseRequest" in parser).toBe(true);
    expect("parseResponse" in parser).toBe(true);
    await expect(parser.parseRequest({ body: { title: "buy milk" } })).resolves.toEqual({
      body: { title: "buy milk" },
    });
    await expect(parser.parseResponse({ id: 1 })).resolves.toEqual({ id: 1 });
  });

  it("throws the original ZodError on invalid request input", async () => {
    const spec = endpoint({
      method: "POST",
      path: "/todos",
      request: { body: z.object({ title: z.string() }) },
      response: z.object({ id: z.number() }),
    });
    const parser = createParser(spec);
    await expect(
      parser.parseRequest({ body: { title: 123 } }),
    ).rejects.toBeInstanceOf(z.ZodError);
  });

  it("omits parseRequest (runtime + type) for a request-less GET spec", async () => {
    const spec = endpoint({
      method: "GET",
      path: "/todos",
      response: z.object({ count: z.number() }),
    });
    const parser = createParser(spec);

    expect("parseRequest" in parser).toBe(false);
    // Type-level: on request-less specs `parseRequest` collapses to `never`, so a
    // real function is not assignable to it — proving it isn't a usable parser.
    // @ts-expect-error — parseRequest is `never` (not present) for request-less specs
    const _pr: typeof parser.parseRequest = (r: RequestShape) => Promise.resolve(r);
    void _pr;
    await expect(parser.parseResponse({ count: 3 })).resolves.toEqual({ count: 3 });
  });

  it("throws the original response error unchanged (no HTTP mapping)", async () => {
    const spec = endpoint({
      method: "GET",
      path: "/todos",
      response: z.object({ count: z.number() }),
    });
    const parser = createParser(spec);
    await expect(
      parser.parseResponse({ count: "not-a-number" }),
    ).rejects.toBeInstanceOf(z.ZodError);
  });

  it("works with Standard Schema validators (~standard only), throwing StandardSchemaError", async () => {
    const okReq = endpoint({
      method: "POST",
      path: "/x",
      request: { body: standardValidator({ value: { ok: true } }) },
      response: standardValidator({ value: { done: true } }),
    });
    const parser = createParser(okReq);
    // The composed request validator returns the envelope; the body bucket's
    // standard validator yields `{ ok: true }`.
    await expect(parser.parseRequest({ body: {} })).resolves.toEqual({
      body: { ok: true },
    });
    await expect(parser.parseResponse({})).resolves.toEqual({ done: true });

    const badReq = endpoint({
      method: "POST",
      path: "/x",
      request: { body: standardValidator({ issues: [{ message: "bad body" }] }) },
      response: standardValidator({ issues: [{ message: "bad resp" }] }),
    });
    const badParser = createParser(badReq);
    await expect(badParser.parseRequest({ body: {} })).rejects.toBeInstanceOf(
      StandardSchemaError,
    );
    await expect(badParser.parseResponse({})).rejects.toBeInstanceOf(StandardSchemaError);
  });

  it("parseResponse output is ValidatorOutput<response>, not the adapter output", async () => {
    const spec = endpoint({
      method: "GET",
      path: "/todos/:id",
      request: { path: z.object({ id: z.string() }) },
      response: z.object({ id: z.number() }),
      adapter: (raw) => ({ ...raw, label: `#${raw.id}` }),
    });
    const parser = createParser(spec);
    const out = await parser.parseResponse({ id: 7 });
    // Adapter is NOT applied by parseResponse — no `label` field at runtime.
    expect(out).toEqual({ id: 7 });
    // Type-level: `out` is the pure response shape, so accessing an adapter-only
    // field is a compile error.
    // @ts-expect-error — `label` comes from the adapter, absent on ValidatorOutput<response>
    void out.label;
  });

  it("drops parseRequest from the type for an interface-annotated spec (design constraint)", () => {
    // Regression guard: `EndpointSpec`'s `request?` is optional, so the index
    // access `TSpec["request"]` resolves to `AnyValidator<R> | undefined`, which
    // fails the `extends AnyValidator<infer R>` branch — parseRequest is dropped
    // from the type (though it still runs). Specs MUST be built via endpoint().
    const spec: EndpointSpec<
      { body: { title: string } },
      typeof responseSchema
    > = {
      method: "POST",
      path: "/todos",
      request: { body: z.object({ title: z.string() }) } as unknown as AnyValidator<{
        body: { title: string };
      }>,
      response: responseSchema,
    };
    const parser = createParser(spec);
    // Type-level: `request?` being optional makes `TSpec["request"]` include
    // `undefined`, failing the conditional → parseRequest collapses to `never`,
    // so a real function is not assignable to it.
    // @ts-expect-error — parseRequest is `never` for interface-annotated specs
    const _pr: typeof parser.parseRequest = (r: RequestShape) => Promise.resolve(r);
    void _pr;
    // Runtime still works because request is present at runtime.
    expect(spec.request).toBeDefined();
  });
});

const responseSchema = z.object({ id: z.number() });
