import type { ApiTypes } from "@routar/core";
import { createApi, defineRouter, endpoint } from "@routar/core";
import { createQueries } from "@routar/react-query";
import { z } from "zod";
import { apiExecutor } from "../lib/executors/api";

const PostSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string(),
  body: z.string(),
});

const CommentSchema = z.object({
  id: z.number(),
  postId: z.number(),
  name: z.string(),
  email: z.string(),
  body: z.string(),
});

// External API (JSONPlaceholder), reached through `apiExecutor` — axios on the
// client, fetch on the server (see remote/lib/executors/api.ts).
export const PostRouter = defineRouter("/posts", {
  getList: endpoint({
    method: "GET",
    path: "/",
    request: {
      query: z
        .object({ _limit: z.coerce.number().optional(), _page: z.coerce.number().optional() })
        .optional(),
    },
    response: z.array(PostSchema),
  }),
  getDetail: endpoint({
    method: "GET",
    path: "/:id",
    request: { path: z.object({ id: z.coerce.number() }) },
    response: PostSchema,
  }),
  getComments: endpoint({
    method: "GET",
    path: "/:id/comments",
    request: { path: z.object({ id: z.coerce.number() }) },
    response: z.array(CommentSchema),
  }),
});

export const postApi = createApi(apiExecutor, PostRouter);

const PER_PAGE = 10;

// The pagination contract is declared once here. `pageParam` maps a page number
// into the `_page` query, so both the server prefetch and the client call
// `postQuery.getList.infinite()` with the same base params (keys match).
export const postQuery = createQueries(postApi, {
  infinite: {
    getList: {
      initialPageParam: 1,
      getNextPageParam: (last, pages) =>
        last.length === PER_PAGE ? pages.length + 1 : undefined,
      pageParam: (page) => ({ query: { _page: page } }),
    },
  },
});

export type PostApiTypes = ApiTypes<typeof postApi>;
export type Post = PostApiTypes["getDetail"]["response"];
export type Comment = PostApiTypes["getComments"]["response"][number];
