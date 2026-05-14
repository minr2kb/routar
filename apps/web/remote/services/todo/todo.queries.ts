'use client';

import { queryOptions, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { todoApi } from './todo.api';
import type { TodoApiTypes } from './todo.api';

const KEYS = {
  all: ['todos'] as const,
  list: (params: TodoApiTypes['getList']['request']) => ['todos', 'list', params] as const,
  detail: (id: number) => ['todos', 'detail', id] as const,
};

export const todoListQueryOptions = (params: TodoApiTypes['getList']['request'] = {}) =>
  queryOptions({
    queryKey: KEYS.list(params),
    queryFn: ({ signal }) => todoApi.getList(params, signal),
  });

export const todoDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: KEYS.detail(id),
    queryFn: ({ signal }) => todoApi.getDetail({ path: { id } }, signal),
  });

export function useTodoList(params: TodoApiTypes['getList']['request'] = {}) {
  return useQuery(todoListQueryOptions(params));
}

export function useTodoDetail(id: number) {
  return useQuery(todoDetailQueryOptions(id));
}

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: TodoApiTypes['create']['request']) => todoApi.create(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: TodoApiTypes['update']['request']) => todoApi.update(req),
    onSuccess: (_, req) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(req.path.id) });
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => todoApi.remove({ path: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
