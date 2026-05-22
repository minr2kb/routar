import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '../../../utils/get-query-client';
import { userDetailQueryOptions } from '../../../remote/services/user/user.queries';
import { postListQueryOptions } from '../../../remote/services/post/post.queries';
import { UserDetailClient } from '../../../components/UserDetailClient';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(userDetailQueryOptions(userId)),
    queryClient.prefetchQuery(postListQueryOptions({ query: { userId, _limit: 5 } })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<p>Loading…</p>}>
        <UserDetailClient id={userId} />
      </Suspense>
    </HydrationBoundary>
  );
}
