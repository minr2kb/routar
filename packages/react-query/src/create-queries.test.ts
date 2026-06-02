import { describe, expect, it, mock } from "bun:test";
import { defineRouter, endpoint } from "@routar/core";
import { z } from "zod";
import { createQueries } from "./create-queries.js";

const TodoRouter = defineRouter("/todos", {
  getList: endpoint({
    method: "GET",
    path: "/",
    request: z.object({ query: z.object({ userId: z.number() }).optional() }),
    response: z.array(z.object({ id: z.number() })),
  }),
  getDetail: endpoint({
    method: "GET",
    path: "/:id",
    request: z.object({ path: z.object({ id: z.number() }) }),
    response: z.object({ id: z.number() }),
  }),
});

function makeApi(listValue: unknown = [], detailValue: unknown = { id: 1 }) {
  const getList = mock(async () => listValue);
  const getDetail = mock(async () => detailValue);
  const api = { getList, getDetail } as any;
  return { api, getList, getDetail };
}

describe("createQueries — queries", () => {
  it("builds queryKey [root, name, params]", () => {
    const { api } = makeApi();
    const q = createQueries(api, TodoRouter);
    const opts = q.getList({ query: { userId: 1 } });
    expect(opts.queryKey as unknown).toEqual([
      "todos",
      "getList",
      { query: { userId: 1 } },
    ]);
  });

  it("omits the params element when called with no params", () => {
    const { api } = makeApi();
    const q = createQueries(api, TodoRouter);
    expect(q.getList().queryKey as unknown).toEqual(["todos", "getList"]);
  });

  it(".queryKey() helper matches the generated key", () => {
    const { api } = makeApi();
    const q = createQueries(api, TodoRouter);
    expect(q.getDetail.queryKey({ path: { id: 5 } }) as unknown).toEqual([
      "todos",
      "getDetail",
      { path: { id: 5 } },
    ]);
  });

  it("queryFn delegates to the api client with (params, signal)", async () => {
    const { api, getDetail } = makeApi([], { id: 9 });
    const q = createQueries(api, TodoRouter);
    const opts = q.getDetail({ path: { id: 9 } });
    const ac = new AbortController();
    const queryFn = opts.queryFn as (ctx: any) => Promise<unknown>;
    const result = await queryFn({ signal: ac.signal });
    expect(result).toEqual({ id: 9 });
    expect(getDetail).toHaveBeenCalledWith({ path: { id: 9 } }, ac.signal);
  });

  it("merges extra query options", () => {
    const { api } = makeApi();
    const q = createQueries(api, TodoRouter);
    const opts = q.getList({ query: { userId: 1 } }, { staleTime: 5000 });
    expect(opts.staleTime).toBe(5000);
  });

  it("exposes $key as the root", () => {
    const { api } = makeApi();
    const q = createQueries(api, TodoRouter);
    expect(q.$key).toEqual(["todos"]);
  });

  it("honors the key override option", () => {
    const { api } = makeApi();
    const q = createQueries(api, TodoRouter, { key: "todo" });
    expect(q.$key).toEqual(["todo"]);
    expect(q.getList().queryKey as unknown).toEqual(["todo", "getList"]);
  });
});
