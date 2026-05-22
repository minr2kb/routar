import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '../../../utils/get-query-client';
import { postDetailQueryOptions, postCommentsQueryOptions } from '../../../remote/services/post/post.queries';
import { PostDetailClient } from '../../../components/PostDetailClient';

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
