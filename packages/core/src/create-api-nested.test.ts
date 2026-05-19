import { describe, expect, it, mock } from 'bun:test';
import { createApi, defineRouter, endpoint } from './index.js';
import { z } from 'zod';

const makeValidator = <T>(value: T) => ({ parse: (data: unknown) => data as T });
const mockExecutor = (response: unknown) => ({ execute: mock(async () => response) });

const UserSchema = z.object({ id: z.number(), name: z.string() });
const TodoSchema = z.object({ id: z.number(), title: z.string() });

describe('nested router', () => {
  const userRouter = defineRouter('/users', {
    getList: endpoint({ method: 'GET' as const, path: '/', response: z.array(UserSchema) }),
    getDetail: endpoint({
      method: 'GET' as const,
      path: '/:id',
      request: z.object({ path: z.object({ id: z.number() }) }),
      response: UserSchema,
    }),
    todos: defineRouter('/todos', {
      getList: endpoint({ method: 'GET' as const, path: '/', response: z.array(TodoSchema) }),
      getDetail: endpoint({
        method: 'GET' as const,
        path: '/:id',
        request: z.object({ path: z.object({ id: z.number() }) }),
        response: TodoSchema,
      }),
      comments: defineRouter('/comments', {
        getList: endpoint({ method: 'GET' as const, path: '/', response: makeValidator([]) }),
      }),
    }),
  });

  it('resolves flat endpoint URL correctly', async () => {
    const executor = mockExecutor([]);
    const api = createApi(executor, userRouter);
    await api.getList({});
    expect(executor.execute).toHaveBeenCalledWith(expect.objectContaining({ url: '/users' }));
  });

  it('resolves nested endpoint URL correctly', async () => {
    const executor = mockExecutor([]);
    const api = createApi(executor, userRouter);
    await api.todos.getList({});
    expect(executor.execute).toHaveBeenCalledWith(expect.objectContaining({ url: '/users/todos' }));
  });

  it('resolves nested endpoint with path param', async () => {
    const executor = mockExecutor({ id: 5, title: 'test' });
    const api = createApi(executor, userRouter);
    await api.todos.getDetail({ path: { id: 5 } });
    expect(executor.execute).toHaveBeenCalledWith(expect.objectContaining({ url: '/users/todos/5' }));
  });

  it('resolves 3-level deep nested URL', async () => {
    const executor = mockExecutor([]);
    const api = createApi(executor, userRouter);
    await api.todos.comments.getList({});
    expect(executor.execute).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/users/todos/comments' }),
    );
  });
});
