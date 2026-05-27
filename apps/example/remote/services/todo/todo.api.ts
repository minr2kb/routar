import { createApi, endpoint, defineRouter } from "@routar/core";
import type { ApiTypes } from "@routar/core";
import { z } from "zod";
import { localExecutor } from "../../lib/executor";

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
    request: z.object({
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
    }),
    response: z.array(TodoRawSchema),
    adapter: (raw) => raw.map(toTodoItem),
  }),
  getDetail: endpoint({
    method: "GET" as const,
    path: "/:id",
    request: z.object({
      path: z.object({ id: z.coerce.number() }),
    }),
    response: TodoRawSchema,
    adapter: toTodoItem,
  }),
  create: endpoint({
    method: "POST" as const,
    path: "/",
    request: z.object({
      body: z.object({
        title: z.string().min(1),
        completed: z.boolean().default(false),
        userId: z.number().default(1),
      }),
    }),
    response: TodoRawSchema,
    adapter: toTodoItem,
  }),
  update: endpoint({
    method: "PATCH" as const,
    path: "/:id",
    request: z.object({
      path: z.object({ id: z.coerce.number() }),
      body: z.object({
        title: z.string().optional(),
        completed: z.boolean().optional(),
      }),
    }),
    response: TodoRawSchema,
    adapter: toTodoItem,
  }),
  remove: endpoint({
    method: "DELETE" as const,
    path: "/:id",
    request: z.object({
      path: z.object({ id: z.coerce.number() }),
    }),
    response: z.unknown(),
  }),
});

export const todoApi = createApi(localExecutor, TodoRouter);

export type TodoApiTypes = ApiTypes<typeof todoApi>;
export type TodoItem = TodoApiTypes["getDetail"]["response"];
export type TodoList = TodoApiTypes["getList"]["response"];
