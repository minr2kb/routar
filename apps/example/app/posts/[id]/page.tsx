import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { PostDetailClient } from "@/components/PostDetailClient";
import {
  postCommentsQueryOptions,
  postDetailQueryOptions,
} from "@/remote/services/post/post.queries";
import { getQueryClient } from "@/utils/get-query-client";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(postDetailQueryOptions(postId)),
    queryClient.prefetchQuery(postCommentsQueryOptions(postId)),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<p>Loading…</p>}>
        <PostDetailClient id={postId} />
      </Suspense>
    </HydrationBoundary>
  );
}
