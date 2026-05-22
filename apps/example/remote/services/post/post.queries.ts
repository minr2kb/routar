'use client';

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { postApi } from './post.api';
import type { PostApiTypes } from './post.api';

export const postListQueryOptions = (params: PostApiTypes['getList']['request'] = {}) =>
  queryOptions({
    queryKey: ['posts', 'list', params] as const,
    queryFn: ({ signal }) => postApi.getList(params, signal),
  });

export const postDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['posts', 'detail', id] as const,
    queryFn: ({ signal }) => postApi.getDetail({ path: { id } }, signal),
  });

export const postCommentsQueryOptions = (postId: number) =>
  queryOptions({
    queryKey: ['posts', 'detail', postId, 'comments'] as const,
    queryFn: ({ signal }) => postApi.getComments({ path: { id: postId } }, signal),
  });

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: PostApiTypes['create']['request']) => postApi.create(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}
