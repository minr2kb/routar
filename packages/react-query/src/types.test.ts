import { describe, it } from "bun:test";
import { createApi, defineRouter, endpoint } from "@routar/core";
import type { InfiniteData } from "@tanstack/react-query";
import { z } from "zod";
import { createQueries } from "./index.js";

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

const Router = defineRouter("/todos", {
  getList: endpoint({
    method: "GET",
    path: "/",
    request: z.object({
      query: z
        .object({ userId: z.number(), _page: z.number().optional() })
        .optional(),
    }),
    response: z.array(z.object({ id: z.number(), title: z.string() })),
  }),
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

// Build the query helpers from a real client (never invoked — only the static type matters).
// createApi stamps the router on `$router`, so createQueries needs no router arg.
const api = createApi({} as never, Router);
const q = createQueries(api);

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

  it("exposes .infinite only on GET accessors, with InfiniteData inference", () => {
    // GET accessor has a callable .infinite
    type _hasInfinite = Expect<
      Equal<
        typeof q.getList.infinite extends (...a: any[]) => any ? true : false,
        true
      >
    >;

    q.getList.infinite(
      { query: { userId: 1 } },
      {
        initialPageParam: 1,
        // lastPage is the per-page response (array of todos), pageParam is number
        getNextPageParam: (lastPage, _all, lastParam) => {
          type _page = Expect<
            Equal<typeof lastPage, { id: number; title: string }[]>
          >;
          type _param = Expect<Equal<typeof lastParam, number>>;
          return lastPage.length ? lastParam + 1 : undefined;
        },
        // pageParam builder: page typed from initialPageParam (number)
        pageParam: (page) => {
          type _p = Expect<Equal<typeof page, number>>;
          return { query: { _page: page } };
        },
        // select receives InfiniteData of the per-page response
        select: (data) => {
          type _data = Expect<
            Equal<
              typeof data,
              InfiniteData<{ id: number; title: string }[], number>
            >
          >;
          return data;
        },
      },
    );

    // @ts-expect-error mutation accessor has no .infinite
    q.create.infinite;
  });
});
