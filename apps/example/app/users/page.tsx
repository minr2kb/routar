import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '../../utils/get-query-client';
import { userListQueryOptions } from '../../remote/services/user/user.queries';
import { UserListClient } from '../../components/UserListClient';

export default async function UsersPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(userListQueryOptions());

  return (
    <div>
      <h1>Users (SSR prefetch + adapter)</h1>
      <p style={{ color: '#666', fontSize: 14 }}>
        Adapter flattens <code>company.name → companyName</code> and <code>address.city → city</code>
      </p>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<p>Loading…</p>}>
          <UserListClient />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
