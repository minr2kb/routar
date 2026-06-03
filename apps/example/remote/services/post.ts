import type { ApiTypes } from "@routar/core";
import { createApi, defineRouter, endpoint } from "@routar/core";
import { createQueries } from "@routar/react-query";
import { z } from "zod";
import { apiExecutor } from "../lib/executor";

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

export const PostRouter = defineRouter("/posts", {
  getList: endpoint({
    method: "GET" as const,
    path: "/",
    request: z.object({
      query: z
        .object({
          userId: z.coerce.number().optional(),
          _limit: z.coerce.number().optional(),
          _page: z.coerce.number().optional(),
        })
        .optional(),
    }),
    response: z.array(PostRawSchema),
  }),
  getDetail: endpoint({
    method: "GET" as const,
    path: "/:id",
    request: z.object({
      path: z.object({ id: z.coerce.number() }),
    }),
    response: PostRawSchema,
  }),
  getComments: endpoint({
    method: "GET" as const,
    path: "/:id/comments",
    request: z.object({
      path: z.object({ id: z.coerce.number() }),
    }),
    response: z.array(CommentRawSchema),
  }),
  create: endpoint({
    method: "POST" as const,
    path: "/",
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

export const postApi = createApi(apiExecutor, PostRouter);

const POSTS_PER_PAGE = 10;

/**
 * The pagination contract is declared once here. Both the server prefetch and
 * the client `useSuspenseInfiniteQuery` then call `postQuery.getList.infinite()`
 * with the same base params, so the query key matches (no hydration mismatch).
 * `pageParam` maps the page number into the request's `_page` query — it
 * replaces writing a `queryFn` by hand.
 */
export const postQuery = createQueries(postApi, {
  infinite: {
    getList: {
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length === POSTS_PER_PAGE ? allPages.length + 1 : undefined,
      pageParam: (page) => ({ query: { _page: page } }),
    },
  },
});

export type PostApiTypes = ApiTypes<typeof postApi>;
export type Post = PostApiTypes["getDetail"]["response"];
export type Comment = PostApiTypes["getComments"]["response"][number];
