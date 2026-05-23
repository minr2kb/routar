import { describe, expect, it, mock } from "bun:test";
import { z } from "zod";
import { createApi, defineRouter, endpoint, ValidationError } from "./index.js";

const makeValidator = <T>(value: T) => ({
  parse: (data: unknown) => data as T,
});
const failValidator = {
  parse: (_: unknown): unknown => {
    throw new Error("parse failed");
  },
};
const mockExecutor = <T>(response: T) => ({
  execute: mock(async () => response),
});

describe("createApi", () => {
  describe("call signatures", () => {
    it("accepts RouterDef", async () => {
      const executor = mockExecutor({ id: 1 });
      const router = defineRouter("/todos", {
        getDetail: {
          method: "GET" as const,
          path: "/:id",
          response: makeValidator({ id: 1 }),
        },
      });
      const api = createApi(executor, router);
      await api.getDetail({ path: { id: 1 } });
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ method: "GET", url: "/todos/1" }),
      );
    });

    it("accepts prefix + endpoints (inline)", async () => {
      const executor = mockExecutor([]);
      const api = createApi(executor, "/items", {
        list: {
          method: "GET" as const,
          path: "/",
          response: makeValidator([]),
        },
      });
      await api.list({});
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/items" }),
      );
    });

    it("accepts endpoints without prefix", async () => {
      const executor = mockExecutor({});
      const api = createApi(executor, {
        ping: {
          method: "GET" as const,
          path: "/ping",
          response: makeValidator({}),
        },
      });
      await api.ping({});
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/ping" }),
      );
    });
  });

  describe("request handling", () => {
    it("passes query params to executor", async () => {
      const executor = mockExecutor([]);
      const api = createApi(executor, "/todos", {
        list: {
          method: "GET" as const,
          path: "/",
          response: makeValidator([]),
        },
      });
      await api.list({ query: { page: 1, limit: 10 } });
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: { page: 1, limit: 10 } }),
      );
    });

    it("passes body to executor", async () => {
      const executor = mockExecutor({ id: 1 });
      const api = createApi(executor, "/todos", {
        create: {
          method: "POST" as const,
          path: "/",
          response: makeValidator({ id: 1 }),
        },
      });
      await api.create({ body: { title: "test" } });
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ body: { title: "test" } }),
      );
    });

    it("passes signal to executor", async () => {
      const executor = mockExecutor({});
      const api = createApi(executor, {
        ping: {
          method: "GET" as const,
          path: "/ping",
          response: makeValidator({}),
        },
      });
      const signal = AbortSignal.abort();
      await api.ping({}, signal);
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ signal }),
      );
    });

    it("calls request.parse with params before executing", async () => {
      const requestValidator = { parse: mock((data: unknown) => data) };
      const executor = mockExecutor({});
      const api = createApi(executor, "/items", {
        get: {
          method: "GET" as const,
          path: "/",
          request: requestValidator,
          response: makeValidator({}),
        },
      });
      const params = { query: { page: 1 } };
      await api.get(params);
      expect(requestValidator.parse).toHaveBeenCalledWith(params);
    });

    it("throws ValidationError when request.parse fails", async () => {
      const executor = mockExecutor({});
      const api = createApi(executor, "/items", {
        get: {
          method: "GET" as const,
          path: "/",
          request: failValidator,
          response: makeValidator({}),
        },
      });
      await expect(api.get({})).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe("response handling", () => {
    it("applies adapter to validated response", async () => {
      const executor = mockExecutor({ created_time: "2024-01-01" });
      const api = createApi(executor, "/todos", {
        get: {
          method: "GET" as const,
          path: "/:id",
          response: makeValidator({ created_time: "2024-01-01" }),
          adapter: (raw: { created_time: string }) => ({
            createdAt: new Date(raw.created_time),
          }),
        },
      });
      const result = await api.get({ path: { id: 1 } });
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("throws ValidationError when response.parse fails", async () => {
      const executor = mockExecutor({ bad: "data" });
      const api = createApi(executor, "/todos", {
        get: { method: "GET" as const, path: "/", response: failValidator },
      });
      await expect(api.get({})).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe("validate option", () => {
    it("skips request.parse when validate: false", async () => {
      const requestValidator = { parse: mock((data: unknown) => data) };
      const executor = mockExecutor({});
      const api = createApi(
        executor,
        "/items",
        { get: { method: "GET" as const, path: "/", request: requestValidator, response: makeValidator({}) } },
        { validate: false },
      );
      await api.get({});
      expect(requestValidator.parse).not.toHaveBeenCalled();
    });

    it("skips response.parse when validate: false", async () => {
      const responseValidator = { parse: mock((data: unknown) => data) };
      const executor = mockExecutor({ raw: true });
      const api = createApi(
        executor,
        "/items",
        { get: { method: "GET" as const, path: "/", response: responseValidator } },
        { validate: false },
      );
      await api.get({});
      expect(responseValidator.parse).not.toHaveBeenCalled();
    });

    it("skips only response.parse when validate: { response: false }", async () => {
      const requestValidator = { parse: mock((data: unknown) => data) };
      const responseValidator = { parse: mock((data: unknown) => data) };
      const executor = mockExecutor({});
      const api = createApi(
        executor,
        "/items",
        { get: { method: "GET" as const, path: "/", request: requestValidator, response: responseValidator } },
        { validate: { request: true, response: false } },
      );
      await api.get({});
      expect(requestValidator.parse).toHaveBeenCalled();
      expect(responseValidator.parse).not.toHaveBeenCalled();
    });

    it("does not throw on failing response validator when validate: false", async () => {
      const executor = mockExecutor({ bad: "data" });
      const api = createApi(
        executor,
        "/todos",
        { get: { method: "GET" as const, path: "/", response: failValidator } },
        { validate: false },
      );
      const result = await api.get({});
      expect(result).toBeDefined();
    });

    it("still validates by default (validate option absent)", async () => {
      const executor = mockExecutor({ bad: "data" });
      const api = createApi(executor, "/todos", {
        get: { method: "GET" as const, path: "/", response: failValidator },
      });
      let error: unknown;
      try {
        await api.get({});
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(ValidationError);
    });

    it("propagates validate option to nested router", async () => {
      const responseValidator = { parse: mock((data: unknown) => data) };
      const executor = mockExecutor([]);
      const inner = defineRouter("/todos", {
        list: { method: "GET" as const, path: "/", response: responseValidator },
      });
      const api = createApi(executor, { users: inner }, { validate: false });
      await api.users.list({});
      expect(responseValidator.parse).not.toHaveBeenCalled();
    });
  });

  describe("nested router", () => {
    const UserSchema = z.object({ id: z.number(), name: z.string() });
    const TodoSchema = z.object({ id: z.number(), title: z.string() });

    const userRouter = defineRouter("/users", {
      getList: endpoint({
        method: "GET" as const,
        path: "/",
        response: z.array(UserSchema),
      }),
      getDetail: endpoint({
        method: "GET" as const,
        path: "/:id",
        request: z.object({ path: z.object({ id: z.number() }) }),
        response: UserSchema,
      }),
      todos: defineRouter("/todos", {
        getList: endpoint({
          method: "GET" as const,
          path: "/",
          response: z.array(TodoSchema),
        }),
        getDetail: endpoint({
          method: "GET" as const,
          path: "/:id",
          request: z.object({ path: z.object({ id: z.number() }) }),
          response: TodoSchema,
        }),
        comments: defineRouter("/comments", {
          getList: endpoint({
            method: "GET" as const,
            path: "/",
            response: makeValidator([]),
          }),
        }),
      }),
    });

    it("resolves flat endpoint URL", async () => {
      const executor = mockExecutor([]);
      const api = createApi(executor, userRouter);
      await api.getList({});
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/users" }),
      );
    });

    it("resolves 1-level nested URL", async () => {
      const executor = mockExecutor([]);
      const api = createApi(executor, userRouter);
      await api.todos.getList({});
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/users/todos" }),
      );
    });

    it("resolves nested URL with path param", async () => {
      const executor = mockExecutor({ id: 5, title: "test" });
      const api = createApi(executor, userRouter);
      await api.todos.getDetail({ path: { id: 5 } });
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/users/todos/5" }),
      );
    });

    it("resolves 3-level deep nested URL", async () => {
      const executor = mockExecutor([]);
      const api = createApi(executor, userRouter);
      await api.todos.comments.getList({});
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/users/todos/comments" }),
      );
    });

    it("prepends outer prefix via inline form", async () => {
      const executor = mockExecutor([]);
      const api = createApi(executor, "/api", { users: userRouter });
      await api.users.getList({});
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/api/users" }),
      );
    });

    it("outer prefix propagates to deeply nested endpoints", async () => {
      const executor = mockExecutor([]);
      const api = createApi(executor, "/api", { users: userRouter });
      await api.users.todos.comments.getList({});
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/api/users/todos/comments" }),
      );
    });
  });

  describe("edge cases", () => {
    it("does not misclassify endpoint spec that has prefix/endpoints-like keys", async () => {
      const executor = mockExecutor({ id: 1 });
      const api = createApi(executor, {
        get: {
          method: "GET" as const,
          path: "/items/:id",
          response: makeValidator({ id: 1 }),
        },
      });
      await api.get({ path: { id: 1 } });
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/items/1" }),
      );
    });

    it("allows calling argless endpoint without params", async () => {
      const executor = mockExecutor({});
      const api = createApi(executor, {
        ping: {
          method: "GET" as const,
          path: "/ping",
          response: makeValidator({}),
        },
      });
      await api.ping();
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/ping" }),
      );
    });

    it("applies adapter even when validate is false", async () => {
      const executor = mockExecutor({ raw: true });
      const api = createApi(
        executor,
        "/items",
        {
          get: {
            method: "GET" as const,
            path: "/",
            response: makeValidator({ raw: true }),
            adapter: (data: { raw: boolean }) => ({ transformed: true, original: data }),
          },
        },
        { validate: false },
      );
      const result = await api.get({});
      expect(result).toEqual({ transformed: true, original: { raw: true } });
    });
  });
});
