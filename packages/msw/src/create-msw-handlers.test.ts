import { describe, expect, it } from "bun:test";
import { HttpResponse, type HttpHandler, type StrictRequest } from "msw";
import { z } from "zod";
import { defineRouter, endpoint } from "@routar/core";
import { createMswHandlers } from "./create-msw-handlers.js";

const BASE_URL = "https://api.example.com";

const TodoSchema = z.object({ id: z.number(), title: z.string() });
const TodoListSchema = z.array(TodoSchema);

const todoRouter = defineRouter("/todos", {
  getList: endpoint({
    method: "GET",
    path: "/",
    response: TodoListSchema,
  }),
  getDetail: endpoint({
    method: "GET",
    path: "/:id",
    request: z.object({ path: z.object({ id: z.coerce.number() }) }),
    response: TodoSchema,
  }),
  create: endpoint({
    method: "POST",
    path: "/",
    request: z.object({ body: z.object({ title: z.string() }) }),
    response: TodoSchema,
  }),
  update: endpoint({
    method: "PATCH",
    path: "/:id",
    request: z.object({
      path: z.object({ id: z.coerce.number() }),
      body: z.object({ title: z.string() }),
    }),
    response: TodoSchema,
  }),
  remove: endpoint({
    method: "DELETE",
    path: "/:id",
    request: z.object({ path: z.object({ id: z.coerce.number() }) }),
    response: z.null(),
  }),
});

async function runHandler(handler: HttpHandler, request: Request) {
  const result = await handler.run({
    request: request as StrictRequest<any>,
    requestId: "test",
  });
  return result?.response ?? null;
}

describe("createMswHandlers — flat router", () => {
  it("returns one handler per provided resolver (partial map)", () => {
    const handlers = createMswHandlers(todoRouter, BASE_URL, {
      getList: () => HttpResponse.json([]),
    });
    expect(handlers).toHaveLength(1);
  });

  it("returns empty array when resolver map is empty", () => {
    expect(createMswHandlers(todoRouter, BASE_URL, {})).toHaveLength(0);
  });

  it("returns a handler per resolver key", () => {
    const handlers = createMswHandlers(todoRouter, BASE_URL, {
      getList: () => HttpResponse.json([]),
      getDetail: () => HttpResponse.json({ id: 1, title: "x" }),
      create: () => HttpResponse.json({ id: 1, title: "x" }),
    });
    expect(handlers).toHaveLength(3);
  });

  it("handler carries correct method and URL pattern in info", () => {
    const [handler] = createMswHandlers(todoRouter, BASE_URL, {
      getDetail: () => HttpResponse.json({ id: 1, title: "x" }),
    });
    expect(handler.info.method).toBe("GET");
    expect(String(handler.info.path)).toBe(`${BASE_URL}/todos/:id`);
  });

  it("GET list resolver returns mock response", async () => {
    const [handler] = createMswHandlers(todoRouter, BASE_URL, {
      getList: () => HttpResponse.json([{ id: 1, title: "Todo 1" }]),
    });
    const res = await runHandler(handler, new Request(`${BASE_URL}/todos`));
    expect(await res!.json()).toEqual([{ id: 1, title: "Todo 1" }]);
  });

  it("handler returns null for non-matching URL", async () => {
    const [handler] = createMswHandlers(todoRouter, BASE_URL, {
      getList: () => HttpResponse.json([]),
    });
    const res = await runHandler(handler, new Request(`${BASE_URL}/other`));
    expect(res).toBeNull();
  });

  it("passes typed path params (z.coerce.number converts string→number)", async () => {
    const [handler] = createMswHandlers(todoRouter, BASE_URL, {
      getDetail: ({ params }) => {
        expect(typeof params.id).toBe("number");
        return HttpResponse.json({ id: params.id, title: "Todo" });
      },
    });
    const res = await runHandler(handler, new Request(`${BASE_URL}/todos/42`));
    expect(await res!.json()).toEqual({ id: 42, title: "Todo" });
  });

  it("passes typed body for POST", async () => {
    const [handler] = createMswHandlers(todoRouter, BASE_URL, {
      create: ({ body }) => HttpResponse.json({ id: 1, title: body.title }),
    });
    const req = new Request(`${BASE_URL}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Todo" }),
    });
    const res = await runHandler(handler, req);
    expect(await res!.json()).toEqual({ id: 1, title: "New Todo" });
  });

  it("passes typed path params and body for PATCH", async () => {
    const [handler] = createMswHandlers(todoRouter, BASE_URL, {
      update: ({ params, body }) =>
        HttpResponse.json({ id: params.id, title: body.title }),
    });
    const req = new Request(`${BASE_URL}/todos/7`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });
    const res = await runHandler(handler, req);
    expect(await res!.json()).toEqual({ id: 7, title: "Updated" });
  });

  it("DELETE handler responds correctly", async () => {
    const [handler] = createMswHandlers(todoRouter, BASE_URL, {
      remove: () => new Response(null, { status: 204 }),
    });
    const res = await runHandler(
      handler,
      new Request(`${BASE_URL}/todos/3`, { method: "DELETE" }),
    );
    expect(res!.status).toBe(204);
  });

  it("passes raw query params when endpoint has no request schema", async () => {
    const searchRouter = defineRouter("/search", {
      find: endpoint({ method: "GET", path: "/", response: z.array(z.string()) }),
    });
    const [handler] = createMswHandlers(searchRouter, BASE_URL, {
      find: ({ query }) => HttpResponse.json([query["q"]]),
    });
    const res = await runHandler(handler, new Request(`${BASE_URL}/search?q=hello`));
    expect(await res!.json()).toEqual(["hello"]);
  });

  it("strips trailing slash from baseURL without doubling it", () => {
    const [handler] = createMswHandlers(todoRouter, `${BASE_URL}/`, {
      getDetail: () => HttpResponse.json({ id: 1, title: "x" }),
    });
    expect(String(handler.info.path)).toBe(`${BASE_URL}/todos/:id`);
  });
});

describe("createMswHandlers — nested router", () => {
  const UserSchema = z.object({ id: z.number(), name: z.string() });

  const userRouter = defineRouter("/users", {
    getList: endpoint({
      method: "GET",
      path: "/",
      response: z.array(UserSchema),
    }),
    todos: defineRouter("/todos", {
      getList: endpoint({ method: "GET", path: "/", response: TodoListSchema }),
      getDetail: endpoint({
        method: "GET",
        path: "/:id",
        request: z.object({ path: z.object({ id: z.coerce.number() }) }),
        response: TodoSchema,
      }),
    }),
  });

  it("counts only leaf handlers across nested map", () => {
    const handlers = createMswHandlers(userRouter, BASE_URL, {
      todos: {
        getList: () => HttpResponse.json([]),
        getDetail: () => HttpResponse.json({ id: 1, title: "x" }),
      },
    });
    expect(handlers).toHaveLength(2);
  });

  it("mixes top-level and nested resolvers in count", () => {
    const handlers = createMswHandlers(userRouter, BASE_URL, {
      getList: () => HttpResponse.json([]),
      todos: { getList: () => HttpResponse.json([]) },
    });
    expect(handlers).toHaveLength(2);
  });

  it("nested handler path is /users/todos/:id", () => {
    const [handler] = createMswHandlers(userRouter, BASE_URL, {
      todos: { getDetail: () => HttpResponse.json({ id: 1, title: "x" }) },
    });
    expect(String(handler.info.path)).toBe(`${BASE_URL}/users/todos/:id`);
  });

  it("nested GET list resolver returns mock response", async () => {
    const [handler] = createMswHandlers(userRouter, BASE_URL, {
      todos: {
        getList: () => HttpResponse.json([{ id: 1, title: "Nested Todo" }]),
      },
    });
    const res = await runHandler(handler, new Request(`${BASE_URL}/users/todos`));
    expect(await res!.json()).toEqual([{ id: 1, title: "Nested Todo" }]);
  });

  it("nested getDetail passes typed path params", async () => {
    const [handler] = createMswHandlers(userRouter, BASE_URL, {
      todos: {
        getDetail: ({ params }) =>
          HttpResponse.json({ id: params.id, title: "nested" }),
      },
    });
    const res = await runHandler(
      handler,
      new Request(`${BASE_URL}/users/todos/5`),
    );
    expect(await res!.json()).toEqual({ id: 5, title: "nested" });
  });
});
