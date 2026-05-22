import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '../../utils/get-query-client';
import { postListQueryOptions } from '../../remote/services/post/post.queries';
import { PostListClient } from '../../components/PostListClient';

export default async function PostsPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(postListQueryOptions({ query: { _limit: 10 } }));

  return (
    <div>
      <h1>Posts</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<p>Loading…</p>}>
          <PostListClient />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
