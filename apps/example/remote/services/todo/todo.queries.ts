'use client';

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { todoApi } from './todo.api';
import type { TodoApiTypes } from './todo.api';

export const todoListQueryOptions = (params: TodoApiTypes['getList']['request'] = {}) =>
  queryOptions({
    queryKey: ['todos', 'list', params] as const,
    queryFn: ({ signal }) => todoApi.getList(params, signal),
  });

export const todoDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['todos', 'detail', id] as const,
    queryFn: ({ signal }) => todoApi.getDetail({ path: { id } }, signal),
  });

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: TodoApiTypes['create']['request']) => todoApi.create(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: TodoApiTypes['update']['request']) => todoApi.update(req),
    onSuccess: (_, req) => {
      qc.invalidateQueries({ queryKey: todoDetailQueryOptions(req.path.id).queryKey });
      qc.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => todoApi.remove({ path: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });
}
