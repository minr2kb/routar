import type { ApiTypes } from "@routar/core";
import { createApi, defineRouter, endpoint } from "@routar/core";
import { createMswHandlers } from "@routar/msw";
import { createQueries } from "@routar/react-query";
import { HttpResponse } from "msw";
import { z } from "zod";
import { LOCAL_API_URL } from "../lib/constants";
import { localExecutor } from "../lib/executors/local";

export const TodoRawSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string(),
  completed: z.boolean(),
});

export const toTodoItem = (raw: z.infer<typeof TodoRawSchema>) => ({
  ...raw,
  label: raw.completed ? `✓ ${raw.title}` : raw.title,
});

export const TodoRouter = defineRouter("/todos", {
  getList: endpoint({
    method: "GET" as const,
    path: "/",
    request: {
      query: z
        .object({
          userId: z.coerce.number().optional(),
          // URL query strings are always strings; preprocess coerces "true"/"false"
          completed: z.preprocess(
            (v) => (typeof v === "string" ? v === "true" : v),
            z.boolean().optional(),
          ),
          _limit: z.coerce.number().optional(),
          _page: z.coerce.number().optional(),
        })
        .optional(),
    },
    response: z.array(TodoRawSchema),
    adapter: (raw) => raw.map(toTodoItem),
  }),
  getDetail: endpoint({
    method: "GET" as const,
    path: "/:id",
    request: {
      path: z.object({ id: z.coerce.number() }),
    },
    response: TodoRawSchema,
    adapter: toTodoItem,
  }),
  create: endpoint({
    method: "POST" as const,
    path: "/",
    request: {
      body: z.object({
        title: z.string().min(1),
        completed: z.boolean().default(false),
        userId: z.number().default(1),
      }),
    },
    response: TodoRawSchema,
    adapter: toTodoItem,
  }),
  update: endpoint({
    method: "PATCH" as const,
    path: "/:id",
    request: {
      path: z.object({ id: z.coerce.number() }),
      body: z.object({
        title: z.string().optional(),
        completed: z.boolean().optional(),
      }),
    },
    response: TodoRawSchema,
    adapter: toTodoItem,
  }),
  remove: endpoint({
    method: "DELETE" as const,
    path: "/:id",
    request: {
      path: z.object({ id: z.coerce.number() }),
    },
    response: z.unknown(),
  }),
});

export const todoApi = createApi(localExecutor, TodoRouter);

// `flatten: true` lets accessors take flat params (the union of the request's
// path/query/body fields) instead of the nested `{ path, query, body }` envelope.
// Every todo endpoint flattens cleanly — no key collides across buckets and each
// body is a plain object — so e.g. `update({ id, completed })` replaces
// `update({ path: { id }, body: { completed } })`. The query key is always built
// from the envelope, so SSR/CSR keys still match across call styles.
//
// `defaults` uses the dynamic `(params, q) => options` form: `q` is the fully
// built queries object, so its key helpers are available for `invalidates`
// without circular-variable issues. `params` is the call params for queries, or
// `undefined` for mutations.
export const todoQuery = createQueries(todoApi, {
  flatten: true,
  defaults: {
    // dynamic default — reference sibling key helpers off the completed `q`
    create: (_, q) => ({ invalidates: [q.getList.queryKey()] }),
    remove: (_, q) => ({ invalidates: [q.getList.queryKey()] }),
  },
});

export const todoMSWHandlers = createMswHandlers(TodoRouter, LOCAL_API_URL, {
  getList: () => HttpResponse.json([{ id: 1 }]),
});

export type TodoApiTypes = ApiTypes<typeof todoApi>;
export type TodoItem = TodoApiTypes["getDetail"]["response"];
export type TodoList = TodoApiTypes["getList"]["response"];
