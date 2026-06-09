import { describe, expect, it, mock, spyOn } from "bun:test";
import { type ApiClientWithRouter, defineRouter, endpoint } from "@routar/core";
import { z } from "zod";
import { createQueries } from "./create-queries.js";
import { routarMutationCache } from "./mutation-cache.js";

const TodoRouter = defineRouter("/todos", {
  getList: endpoint({
    method: "GET",
    path: "/",
    request: z.object({
      query: z
        .object({ userId: z.number(), _page: z.number().optional() })
        .optional(),
    }),
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

// Minimal valid infinite options for key/shape assertions.
function infiniteOpts() {
  return {
    initialPageParam: 1,
    getNextPageParam: () => undefined as number | undefined,
    pageParam: (page: number) => ({ query: { _page: page } }),
  };
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
      request: z.object({
        query: z.object({ page: z.number().optional() }).optional(),
      }),
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

  it("exposes .infinite on nested GET accessors with accumulated key", () => {
    const api = {
      getList: mock(async () => []),
      todos: { getList: mock(async () => []) },
      $router: NestedRouter,
    } as unknown as ApiClientWithRouter<typeof NestedRouter.endpoints>;
    const q = createQueries(api);
    expect(q.todos.getList.infinite.queryKey() as unknown).toEqual([
      "users",
      "todos",
      "getList",
      "infinite",
    ]);
  });

  it("applies nested infinite config + defaults to nested endpoints", async () => {
    const nestedGetList = mock(async () => [{ id: 1 }]);
    const api = {
      getList: mock(async () => []),
      todos: { getList: nestedGetList },
      $router: NestedRouter,
    } as unknown as ApiClientWithRouter<typeof NestedRouter.endpoints>;
    const q = createQueries(api, {
      defaults: { todos: { getList: { staleTime: 7000 } } },
      infinite: {
        todos: {
          getList: {
            initialPageParam: 1,
            getNextPageParam: (last, all) =>
              last.length ? all.length + 1 : undefined,
            pageParam: (page) => ({ query: { page } }),
          },
        },
      },
    });

    // nested default reached the nested query accessor
    expect(q.todos.getList().staleTime).toBe(7000);

    // nested infinite contract reached the nested accessor → no call options needed
    const opts = q.todos.getList.infinite();
    const queryFn = opts.queryFn as (ctx: any) => Promise<unknown>;
    await queryFn({ pageParam: 4, signal: undefined });
    expect(nestedGetList).toHaveBeenCalledWith(
      { query: { page: 4 } },
      undefined,
    );
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

describe("createQueries — infinite accessor", () => {
  it("builds an infinite key with the 'infinite' segment", () => {
    const { api } = makeApi();
    const q = createQueries(api);
    expect(
      q.getList.infinite({ query: { userId: 1 } }, infiniteOpts())
        .queryKey as unknown,
    ).toEqual(["todos", "getList", "infinite", { query: { userId: 1 } }]);
    expect(q.getList.infinite.queryKey() as unknown).toEqual([
      "todos",
      "getList",
      "infinite",
    ]);
  });

  it("deep-merges the pageParam builder result into the base params", async () => {
    const { api, getList } = makeApi([{ id: 1 }]);
    const q = createQueries(api);
    const opts = q.getList.infinite(
      { query: { userId: 1 } },
      {
        initialPageParam: 2,
        getNextPageParam: () => undefined,
        pageParam: (page) => ({ query: { _page: page } }),
      },
    );
    const queryFn = opts.queryFn as (ctx: any) => Promise<unknown>;
    await queryFn({ pageParam: 2, signal: undefined });
    // base query.userId preserved, page param merged in
    expect(getList).toHaveBeenCalledWith(
      { query: { userId: 1, _page: 2 } },
      undefined,
    );
  });

  it("carries initialPageParam and getNextPageParam through", () => {
    const { api } = makeApi();
    const q = createQueries(api);
    const getNextPageParam = () => 3;
    const opts = q.getList.infinite(undefined as never, {
      initialPageParam: 1,
      getNextPageParam,
      pageParam: (page) => ({ query: { _page: page } }),
    });
    expect((opts as { initialPageParam?: unknown }).initialPageParam).toBe(1);
    expect((opts as { getNextPageParam?: unknown }).getNextPageParam).toBe(
      getNextPageParam,
    );
  });
});

describe("createQueries — infinite via config (+ per-call override)", () => {
  it("configured endpoint: .infinite(params) works with no call options", async () => {
    const { api, getList } = makeApi([{ id: 1 }]);
    const q = createQueries(api, {
      infinite: {
        getList: {
          initialPageParam: 1,
          getNextPageParam: (last, all) =>
            last.length ? all.length + 1 : undefined,
          pageParam: (page) => ({ query: { _page: page } }),
        },
      },
    });
    const opts = q.getList.infinite({ query: { userId: 1 } });
    expect(opts.queryKey as unknown).toEqual([
      "todos",
      "getList",
      "infinite",
      { query: { userId: 1 } },
    ]);
    const queryFn = opts.queryFn as (ctx: any) => Promise<unknown>;
    await queryFn({ pageParam: 3, signal: undefined });
    expect(getList).toHaveBeenCalledWith(
      { query: { userId: 1, _page: 3 } },
      undefined,
    );
  });

  it("per-call override wins over the configured contract", () => {
    const { api } = makeApi();
    const q = createQueries(api, {
      infinite: {
        getList: {
          initialPageParam: 1,
          getNextPageParam: () => undefined,
          pageParam: (page) => ({ query: { _page: page } }),
        },
      },
    });
    const opts = q.getList.infinite(
      { query: { userId: 1 } },
      {
        initialPageParam: 5,
      },
    );
    expect((opts as { initialPageParam?: unknown }).initialPageParam).toBe(5);
  });

  it("throws a clear error when no contract is supplied (config or call site)", () => {
    const { api } = makeApi();
    const q = createQueries(api);
    // Unconfigured + no call-site contract is a type error; force it to verify
    // the runtime guard message.
    const infinite = q.getList.infinite as (params?: unknown) => unknown;
    expect(() => infinite({ query: { userId: 1 } })).toThrow(
      /pagination contract/,
    );
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

  it("routes invalidates from defaults into meta.invalidates", () => {
    const create = mock(async () => ({ id: 1 }));
    const q = createQueries(
      {
        create,
        $router: TodoMutationRouter,
      } as unknown as ApiClientWithRouter<typeof TodoMutationRouter.endpoints>,
      { defaults: { create: { invalidates: [["todos"]] } } },
    );
    // default invalidates must end up in meta.invalidates
    expect((q.create() as any).meta?.invalidates).toEqual([["todos"]]);
    // call-site invalidates overrides the default
    expect(
      (q.create({ invalidates: [["todos", "getList"]] }) as any).meta?.invalidates,
    ).toEqual([["todos", "getList"]]);
  });

  it("merges meta from default and call-site for mutations", () => {
    const create = mock(async () => ({ id: 1 }));
    const q = createQueries(
      {
        create,
        $router: TodoMutationRouter,
      } as unknown as ApiClientWithRouter<typeof TodoMutationRouter.endpoints>,
      { defaults: { create: { meta: { source: "default" } } } },
    );
    const opts = q.create({ meta: { extra: "call" } } as any);
    expect((opts.meta as any)?.source).toBe("default");
    expect((opts.meta as any)?.extra).toBe("call");
  });
});

describe("createQueries — dynamic defaults (function form)", () => {
  it("evaluates a `(params) => options` default with the call params", () => {
    const { api } = makeApi();
    const seen: unknown[] = [];
    const q = createQueries(api, {
      defaults: {
        getList: (params) => {
          seen.push(params);
          return { staleTime: 4321 };
        },
      },
    });
    const opts = q.getList({ query: { userId: 1 } });
    expect(opts.staleTime).toBe(4321);
    expect(seen).toEqual([{ query: { userId: 1 } }]);
  });

  it("`(_, q)` receives a fully-built q whose key helpers work", () => {
    const create = mock(async () => ({ id: 1 }));
    let capturedQ: any;
    const q = createQueries(
      {
        create,
        $router: TodoMutationRouter,
      } as unknown as ApiClientWithRouter<typeof TodoMutationRouter.endpoints>,
      {
        defaults: {
          create: (_, qref) => {
            capturedQ = qref;
            return { invalidates: [qref.$key] };
          },
        },
      },
    );
    // dynamic default routes invalidates into meta.invalidates, using q.$key
    expect((q.create() as any).meta?.invalidates).toEqual([["todos"]]);
    // q passed to the default is the fully-built object (same key helpers)
    expect(capturedQ.create.mutationKey).toEqual(["todos", "create"]);
    expect(capturedQ.$key).toEqual(["todos"]);
  });

  it("mutation dynamic default is invoked with params = undefined", () => {
    const create = mock(async () => ({ id: 1 }));
    const seen: unknown[] = [];
    const q = createQueries(
      {
        create,
        $router: TodoMutationRouter,
      } as unknown as ApiClientWithRouter<typeof TodoMutationRouter.endpoints>,
      {
        defaults: {
          create: (params) => {
            seen.push(params);
            return { gcTime: 99 };
          },
        },
      },
    );
    expect((q.create() as { gcTime?: number }).gcTime).toBe(99);
    expect(seen).toEqual([undefined]);
  });

  it("mixes static and dynamic defaults across endpoints", () => {
    const { api } = makeApi();
    const q = createQueries(api, {
      defaults: {
        getList: { staleTime: 1000 }, // static
        getDetail: () => ({ staleTime: 2000 }), // dynamic
      },
    });
    expect(q.getList().staleTime).toBe(1000);
    expect(q.getDetail({ path: { id: 1 } }).staleTime).toBe(2000);
  });

  it("per-call options override a dynamic default", () => {
    const { api } = makeApi();
    const q = createQueries(api, {
      defaults: { getList: () => ({ staleTime: 5000 }) },
    });
    expect(q.getList(undefined, { staleTime: 10 }).staleTime).toBe(10);
  });
});

const FlattenRouter = defineRouter("/todos", {
  getDetail: endpoint({
    method: "GET",
    path: "/:id",
    request: z.object({ path: z.object({ id: z.number() }) }),
    response: z.object({ id: z.number() }),
  }),
  update: endpoint({
    method: "PATCH",
    path: "/:id",
    request: z.object({
      path: z.object({ id: z.number() }),
      body: z.object({ title: z.string() }),
    }),
    response: z.object({ id: z.number() }),
  }),
  // collision: `id` lives in both path and body → not flattenable.
  collide: endpoint({
    method: "POST",
    path: "/:id",
    request: z.object({
      path: z.object({ id: z.number() }),
      body: z.object({ id: z.number(), title: z.string() }),
    }),
    response: z.object({ id: z.number() }),
  }),
  // non-object body (array) → not flattenable.
  bulk: endpoint({
    method: "POST",
    path: "/",
    request: z.object({ body: z.array(z.object({ title: z.string() })) }),
    response: z.array(z.object({ id: z.number() })),
  }),
});

function makeFlattenApi() {
  const getDetail = mock(async () => ({ id: 1 }));
  const update = mock(async () => ({ id: 1 }));
  const collide = mock(async () => ({ id: 1 }));
  const bulk = mock(async () => [{ id: 1 }]);
  const api = {
    getDetail,
    update,
    collide,
    bulk,
    $router: FlattenRouter,
  } as unknown as ApiClientWithRouter<typeof FlattenRouter.endpoints>;
  return { api, getDetail, update, collide, bulk };
}

describe("createQueries — flatten", () => {
  it("flatten: true → getDetail({ id }) calls the api with { path: { id } }", async () => {
    const { api, getDetail } = makeFlattenApi();
    const q = createQueries(api, { flatten: true });
    const opts = q.getDetail({ id: 5 } as never);
    const queryFn = opts.queryFn as (ctx: any) => Promise<unknown>;
    await queryFn({ signal: undefined });
    expect(getDetail).toHaveBeenCalledWith({ path: { id: 5 } }, undefined);
  });

  it("flatten queryKey is built from the envelope, not the flat params", () => {
    const { api } = makeFlattenApi();
    const q = createQueries(api, { flatten: true });
    expect(q.getDetail({ id: 5 } as never).queryKey as unknown).toEqual([
      "todos",
      "getDetail",
      { path: { id: 5 } },
    ]);
  });

  it("flatten multi-bucket: update({ id, title }) → { path: { id }, body: { title } }", async () => {
    const { api, update } = makeFlattenApi();
    const q = createQueries(api, { flatten: true });
    const opts = q.update();
    const mutationFn = opts.mutationFn as (vars: any) => Promise<unknown>;
    await mutationFn({ id: 7, title: "x" });
    expect(update).toHaveBeenCalledWith({
      path: { id: 7 },
      body: { title: "x" },
    });
  });

  it("flatten: false (default) leaves the envelope call style unchanged", async () => {
    const { api, getDetail } = makeFlattenApi();
    const q = createQueries(api);
    const opts = q.getDetail({ path: { id: 9 } });
    expect(opts.queryKey as unknown).toEqual([
      "todos",
      "getDetail",
      { path: { id: 9 } },
    ]);
    const queryFn = opts.queryFn as (ctx: any) => Promise<unknown>;
    await queryFn({ signal: undefined });
    expect(getDetail).toHaveBeenCalledWith({ path: { id: 9 } }, undefined);
  });

  it("collision endpoint (path.id + body.id) keeps the envelope even under flatten", async () => {
    const { api, collide } = makeFlattenApi();
    const q = createQueries(api, { flatten: true });
    const opts = q.collide();
    const mutationFn = opts.mutationFn as (vars: any) => Promise<unknown>;
    const envelope = { path: { id: 1 }, body: { id: 1, title: "x" } };
    await mutationFn(envelope);
    expect(collide).toHaveBeenCalledWith(envelope);
  });

  it("non-object body endpoint keeps the envelope even under flatten", async () => {
    const { api, bulk } = makeFlattenApi();
    const q = createQueries(api, { flatten: true });
    const opts = q.bulk();
    const mutationFn = opts.mutationFn as (vars: any) => Promise<unknown>;
    const envelope = { body: [{ title: "x" }] };
    await mutationFn(envelope);
    expect(bulk).toHaveBeenCalledWith(envelope);
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
