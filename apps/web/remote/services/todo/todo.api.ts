import { createApi, defineRouter } from '@routar/core';
import type { ApiTypes } from '@routar/core';
import { z } from 'zod';
import { clientExecutor, fetchExecutor } from '../../lib/executor';

const TodoRawSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string(),
  completed: z.boolean(),
});

const TodoListRawSchema = z.array(TodoRawSchema);

const toTodoItem = (raw: z.infer<typeof TodoRawSchema>) => ({
  ...raw,
  label: raw.completed ? `✓ ${raw.title}` : raw.title,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toTodoItemAny = toTodoItem as (raw: any) => ReturnType<typeof toTodoItem>;

export const TodoRouter = defineRouter('/todos', {
  getList: {
    method: 'GET' as const,
    path: '/',
    request: z.object({
      query: z.object({
        userId: z.number().optional(),
        completed: z.boolean().optional(),
        _limit: z.number().optional(),
        _page: z.number().optional(),
      }).optional(),
    }),
    response: TodoListRawSchema,
    adapter: (raw: any) => (raw as z.infer<typeof TodoListRawSchema>).map(toTodoItem),
  },
  getDetail: {
    method: 'GET' as const,
    path: '/:id',
    request: z.object({
      path: z.object({ id: z.number() }),
    }),
    response: TodoRawSchema,
    adapter: toTodoItemAny,
  },
  create: {
    method: 'POST' as const,
    path: '/',
    request: z.object({
      body: z.object({
        title: z.string().min(1),
        completed: z.boolean().default(false),
        userId: z.number().default(1),
      }),
    }),
    response: TodoRawSchema,
    adapter: toTodoItemAny,
  },
  update: {
    method: 'PATCH' as const,
    path: '/:id',
    request: z.object({
      path: z.object({ id: z.number() }),
      body: z.object({
        title: z.string().optional(),
        completed: z.boolean().optional(),
      }),
    }),
    response: TodoRawSchema,
    adapter: toTodoItemAny,
  },
  remove: {
    method: 'DELETE' as const,
    path: '/:id',
    request: z.object({
      path: z.object({ id: z.number() }),
    }),
    response: z.unknown(),
  },
});

export const todoApi = createApi(clientExecutor, TodoRouter);
export const todoServerApi = createApi(fetchExecutor, TodoRouter);

export type TodoApiTypes = ApiTypes<typeof todoApi>;
export type TodoItem = TodoApiTypes['getDetail']['response'];
export type TodoList = TodoApiTypes['getList']['response'];
