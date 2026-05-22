import { createApi, defineRouter, endpoint } from '@routar/core';
import type { ApiTypes } from '@routar/core';
import { z } from 'zod';
import { clientExecutor, fetchExecutor } from '../../lib/executor';

const PostRawSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string(),
  body: z.string(),
});

const CommentRawSchema = z.object({
  id: z.number(),
  postId: z.number(),
  name: z.string(),
  email: z.string(),
  body: z.string(),
});

export const PostRouter = defineRouter('/posts', {
  getList: endpoint({
    method: 'GET' as const,
    path: '/',
    request: z.object({
      query: z.object({
        userId: z.number().optional(),
        _limit: z.number().optional(),
        _page: z.number().optional(),
      }).optional(),
    }),
    response: z.array(PostRawSchema),
  }),
  getDetail: endpoint({
    method: 'GET' as const,
    path: '/:id',
    request: z.object({
      path: z.object({ id: z.number() }),
    }),
    response: PostRawSchema,
  }),
  getComments: endpoint({
    method: 'GET' as const,
    path: '/:id/comments',
    request: z.object({
      path: z.object({ id: z.number() }),
    }),
    response: z.array(CommentRawSchema),
  }),
  create: endpoint({
    method: 'POST' as const,
    path: '/',
    request: z.object({
      body: z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        userId: z.number(),
      }),
    }),
    response: PostRawSchema,
  }),
});

export const postApi = createApi(clientExecutor, PostRouter);
export const postServerApi = createApi(fetchExecutor, PostRouter);

export type PostApiTypes = ApiTypes<typeof postApi>;
export type Post = PostApiTypes['getDetail']['response'];
export type Comment = PostApiTypes['getComments']['response'][number];
