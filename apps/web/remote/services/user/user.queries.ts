'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import { userApi } from './user.api';

const KEYS = {
  all: ['users'] as const,
  list: () => ['users', 'list'] as const,
  detail: (id: number) => ['users', 'detail', id] as const,
};

export const userListQueryOptions = () =>
  queryOptions({
    queryKey: KEYS.list(),
    queryFn: ({ signal }) => userApi.getList({}, signal),
  });

export const userDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: KEYS.detail(id),
    queryFn: ({ signal }) => userApi.getDetail({ path: { id } }, signal),
  });

export function useUserList() {
  return useQuery(userListQueryOptions());
}

export function useUserDetail(id: number) {
  return useQuery(userDetailQueryOptions(id));
}
