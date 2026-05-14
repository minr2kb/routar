import { createApi, defineRouter } from '@routar/core';
import type { ApiTypes } from '@routar/core';
import { z } from 'zod';
import { clientExecutor, serverExecutor } from '../../lib/executor';

const TodoSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string(),
  completed: z.boolean(),
});

const TodoListSchema = z.array(TodoSchema);

export const TodoRouter = defineRouter('/todos', {
  getList: {
    method: 'GET',
    path: '/',
    response: TodoListSchema,
  },
  getDetail: {
    method: 'GET',
    path: '/:id',
    response: TodoSchema,
  },
});

export const todoApi = createApi(clientExecutor, TodoRouter);
export const todoServerApi = createApi(serverExecutor, TodoRouter);

export type TodoApiTypes = ApiTypes<typeof todoApi>;
export type TodoItem = TodoApiTypes['getDetail']['response'];
export type TodoList = TodoApiTypes['getList']['response'];
