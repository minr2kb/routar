import { describe, expect, it, mock, spyOn } from "bun:test";
import { type ApiClientWithRouter, defineRouter, endpoint } from "@routar/core";
import { z } from "zod";
import { createQueries } from "./create-queries.js";
import { routarMutationCache } from "./mutation-cache.js";

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
  const api = {
    getList,
    getDetail,
    $router: TodoRouter,
  } as unknown as ApiClientWithRouter<typeof TodoRouter.endpoints>;
  return { api, getList, getDetail };
}

describe("createQueries — queries", () => {
  it("builds queryKey [root, name, params]", () => {
    const { api } = makeApi();
    const q = createQueries(api);
    const opts = q.getList({ query: { userId: 1 } });
    expect(opts.queryKey as unknown).toEqual([
      "todos",
      "getList",
      { query: { userId: 1 } },
    ]);
  });

  it("omits the params element when called with no params", () => {
    const { api } = makeApi();
    const q = createQueries(api);
    expect(q.getList().queryKey as unknown).toEqual(["todos", "getList"]);
  });

  it(".queryKey() helper matches the generated key", () => {
    const { api } = makeApi();
    const q = createQueries(api);
    expect(q.getDetail.queryKey({ path: { id: 5 } }) as unknown).toEqual([
      "todos",
      "getDetail",
      { path: { id: 5 } },
    ]);
  });

  it("queryFn delegates to the api client with (params, signal)", async () => {
    const { api, getDetail } = makeApi([], { id: 9 });
    const q = createQueries(api);
    const opts = q.getDetail({ path: { id: 9 } });
    const ac = new AbortController();
    const queryFn = opts.queryFn as (ctx: any) => Promise<unknown>;
    const result = await queryFn({ signal: ac.signal });
    expect(result).toEqual({ id: 9 });
    expect(getDetail).toHaveBeenCalledWith({ path: { id: 9 } }, ac.signal);
  });

  it("merges extra query options", () => {
    const { api } = makeApi();
    const q = createQueries(api);
    const opts = q.getList({ query: { userId: 1 } }, { staleTime: 5000 });
    expect(opts.staleTime).toBe(5000);
  });

  it("exposes $key as the root", () => {
    const { api } = makeApi();
    const q = createQueries(api);
    expect(q.$key).toEqual(["todos"]);
  });

  it("honors the key override option", () => {
    const { api } = makeApi();
    const q = createQueries(api, { key: "todo" });
    expect(q.$key).toEqual(["todo"]);
    expect(q.getList().queryKey as unknown).toEqual(["todo", "getList"]);
  });
});

const TodoMutationRouter = defineRouter("/todos", {
  create: endpoint({
    method: "POST",
    path: "/",
    request: z.object({ body: z.object({ title: z.string() }) }),
    response: z.object({ id: z.number() }),
  }),
});

describe("createQueries — mutations", () => {
  it("builds mutationKey [root, name]", () => {
    const create = mock(async () => ({ id: 1 }));
    const q = createQueries({
      create,
      $router: TodoMutationRouter,
    } as unknown as ApiClientWithRouter<typeof TodoMutationRouter.endpoints>);
    expect(q.create.mutationKey).toEqual(["todos", "create"]);
    expect(q.create().mutationKey).toEqual(["todos", "create"]);
  });

  it("mutationFn delegates to the api client with vars", async () => {
    const create = mock(async () => ({ id: 7 }));
    const q = createQueries({
      create,
      $router: TodoMutationRouter,
    } as unknown as ApiClientWithRouter<typeof TodoMutationRouter.endpoints>);
    const opts = q.create();
    const mutationFn = opts.mutationFn as (vars: any) => Promise<unknown>;
    const result = await mutationFn({ body: { title: "x" } });
    expect(result).toEqual({ id: 7 });
    expect(create).toHaveBeenCalledWith({ body: { title: "x" } });
  });

  it("loads invalidates into meta.invalidates", () => {
    const create = mock(async () => ({ id: 1 }));
    const q = createQueries({
      create,
      $router: TodoMutationRouter,
    } as unknown as ApiClientWithRouter<typeof TodoMutationRouter.endpoints>);
    const opts = q.create({ invalidates: [["todos"]] });
    expect(opts.meta).toEqual({ invalidates: [["todos"]] });
  });

  it("preserves user-supplied handlers and meta", () => {
    const create = mock(async () => ({ id: 1 }));
    const q = createQueries({
      create,
      $router: TodoMutationRouter,
    } as unknown as ApiClientWithRouter<typeof TodoMutationRouter.endpoints>);
    const onSuccess = mock(() => {});
    const opts = q.create({
      onSuccess,
      meta: { trace: "abc" },
      invalidates: [["todos"]],
    });
    expect(opts.onSuccess).toBe(onSuccess);
    expect(opts.meta).toEqual({ trace: "abc", invalidates: [["todos"]] });
  });
});

const NestedRouter = defineRouter("/users", {
  getList: endpoint({
    method: "GET",
    path: "/",
    response: z.array(z.object({ id: z.number() })),
  }),
  todos: defineRouter("/todos", {
    getList: endpoint({
      method: "GET",
      path: "/",
      response: z.array(z.object({ id: z.number() })),
    }),
  }),
});

describe("createQueries — nested routers", () => {
  it("recurses and accumulates root segments", () => {
    const usersGetList = mock(async () => []);
    const todosGetList = mock(async () => []);
    const api = {
      getList: usersGetList,
      todos: { getList: todosGetList },
      $router: NestedRouter,
    } as unknown as ApiClientWithRouter<typeof NestedRouter.endpoints>;
    const q = createQueries(api);

    expect(q.$key).toEqual(["users"]);
    expect(q.todos.$key).toEqual(["users", "todos"]);
    expect(q.getList().queryKey as unknown).toEqual(["users", "getList"]);
    expect(q.todos.getList().queryKey as unknown).toEqual([
      "users",
      "todos",
      "getList",
    ]);
  });

  it("nested queryFn delegates to the nested api function", async () => {
    const todosGetList = mock(async () => [{ id: 3 }]);
    const api = {
      getList: mock(async () => []),
      todos: { getList: todosGetList },
      $router: NestedRouter,
    } as unknown as ApiClientWithRouter<typeof NestedRouter.endpoints>;
    const q = createQueries(api);
    const queryFn = q.todos.getList().queryFn as (ctx: any) => Promise<unknown>;
    const result = await queryFn({ signal: undefined });
    expect(result).toEqual([{ id: 3 }]);
    expect(todosGetList).toHaveBeenCalled();
  });
});

describe("createQueries — empty-param key normalization (A2)", () => {
  it("getList() and getList({}) produce the same queryKey", () => {
    const { api } = makeApi();
    const q = createQueries(api);
    const bare = q.getList().queryKey as unknown;
    expect(q.getList({}).queryKey as unknown).toEqual(bare);
    expect(q.getList.queryKey({}) as unknown).toEqual(bare);
  });
});

describe("createQueries — per-endpoint defaults (C4)", () => {
  it("merges a query default, and a per-call option overrides it", () => {
    const { api } = makeApi();
    const q = createQueries(api, {
      defaults: { getList: { staleTime: 5000 } },
    });
    expect(q.getList().staleTime).toBe(5000);
    // per-call wins over the endpoint default
    expect(q.getList(undefined, { staleTime: 1000 }).staleTime).toBe(1000);
    // a different endpoint is unaffected
    expect(q.getDetail({ path: { id: 1 } }).staleTime).toBeUndefined();
  });

  it("merges a mutation default while keeping mutationFn/mutationKey", () => {
    const create = mock(async () => ({ id: 1 }));
    const q = createQueries(
      {
        create,
        $router: TodoMutationRouter,
      } as unknown as ApiClientWithRouter<typeof TodoMutationRouter.endpoints>,
      { defaults: { create: { gcTime: 1234 } } },
    );
    const opts = q.create();
    expect((opts as { gcTime?: number }).gcTime).toBe(1234);
    expect(opts.mutationKey).toEqual(["todos", "create"]);
    expect(typeof opts.mutationFn).toBe("function");
  });
});

describe("createQueries — unwired invalidates warning (A1)", () => {
  it("does not warn when routarMutationCache is wired", () => {
    // Wiring the cache flips the module flag; correctly-wired apps must stay quiet.
    routarMutationCache(() => ({}) as never);
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    try {
      const create = mock(async () => ({ id: 1 }));
      const q = createQueries({
        create,
        $router: TodoMutationRouter,
      } as unknown as ApiClientWithRouter<typeof TodoMutationRouter.endpoints>);
      q.create({ invalidates: [["todos"]] });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
