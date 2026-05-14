import { queryOptions } from '@tanstack/react-query';
import { todoApi } from './todo.api';
import type { TodoApiTypes } from './todo.api';

export const todoListQueryOptions = () =>
  queryOptions({
    queryKey: ['todos', 'list'],
    queryFn: ({ signal }) => todoApi.getList({}, signal),
  });

export const todoDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['todos', 'detail', id],
    queryFn: ({ signal }) => todoApi.getDetail({ path: { id } }, signal),
  });
