import { describe, it } from "bun:test";
import { defineRouter, endpoint } from "@routar/core";
import { z } from "zod";
import { createQueries } from "./index.js";

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

const Router = defineRouter("/todos", {
  getDetail: endpoint({
    method: "GET",
    path: "/:id",
    request: z.object({ path: z.object({ id: z.number() }) }),
    response: z.object({ id: z.number(), title: z.string() }),
  }),
  create: endpoint({
    method: "POST",
    path: "/",
    request: z.object({ body: z.object({ title: z.string() }) }),
    response: z.object({ id: z.number(), title: z.string() }),
  }),
});

// Build the query helpers from a fake client (never invoked — only the static type matters).
const q = createQueries({} as never, Router);

describe("type-level", () => {
  it("discriminates query vs mutation, enforces params, infers data", () => {
    // GET → query accessor: data type flows to the `select` callback param.
    q.getDetail(
      { path: { id: 1 } },
      {
        select: (data) => {
          type _data = Expect<
            Equal<typeof data, { id: number; title: string }>
          >;
          return data;
        },
      },
    );

    // query accessor exposes a callable .queryKey helper
    type _hasQueryKey = Expect<
      Equal<
        typeof q.getDetail.queryKey extends (...a: any[]) => any ? true : false,
        true
      >
    >;

    // POST → mutation accessor exposes .mutationKey (not a function), and NO .queryKey
    type _hasMutationKey = Expect<
      Equal<
        typeof q.create.mutationKey extends readonly unknown[] ? true : false,
        true
      >
    >;
    // @ts-expect-error mutation accessor has no .queryKey
    q.create.queryKey;

    // @ts-expect-error GET query accessor with a required-path request must be called with params
    q.getDetail();

    // $key is present at the root
    type _hasRootKey = Expect<
      Equal<typeof q.$key extends readonly unknown[] ? true : false, true>
    >;
  });
});
