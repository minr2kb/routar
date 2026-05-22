'use client';

import { queryOptions } from '@tanstack/react-query';
import { userApi } from './user.api';

export const userListQueryOptions = () =>
  queryOptions({
    queryKey: ['users', 'list'] as const,
    queryFn: ({ signal }) => userApi.getList({}, signal),
  });

export const userDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['users', 'detail', id] as const,
    queryFn: ({ signal }) => userApi.getDetail({ path: { id } }, signal),
  });
