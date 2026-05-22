'use client';

import { queryOptions, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { postApi } from './post.api';
import type { PostApiTypes } from './post.api';

const KEYS = {
  all: ['posts'] as const,
  list: (params: PostApiTypes['getList']['request']) => ['posts', 'list', params] as const,
  detail: (id: number) => ['posts', 'detail', id] as const,
  comments: (id: number) => ['posts', 'detail', id, 'comments'] as const,
};

export const postListQueryOptions = (params: PostApiTypes['getList']['request'] = {}) =>
  queryOptions({
    queryKey: KEYS.list(params),
    queryFn: ({ signal }) => postApi.getList(params, signal),
  });

export const postDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: KEYS.detail(id),
    queryFn: ({ signal }) => postApi.getDetail({ path: { id } }, signal),
  });

export const postCommentsQueryOptions = (postId: number) =>
  queryOptions({
    queryKey: KEYS.comments(postId),
    queryFn: ({ signal }) => postApi.getComments({ path: { id: postId } }, signal),
  });

export function usePostList(params: PostApiTypes['getList']['request'] = {}) {
  return useQuery(postListQueryOptions(params));
}

export function usePostDetail(id: number) {
  return useQuery(postDetailQueryOptions(id));
}

export function usePostComments(postId: number) {
  return useQuery(postCommentsQueryOptions(postId));
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: PostApiTypes['create']['request']) => postApi.create(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
