import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '../../utils/get-query-client';
import { todoListQueryOptions } from '@/remote/services/todo/todo.queries';
import { TodoListClient } from '@/components/TodoListClient';

export default async function TodosPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(todoListQueryOptions({ query: { _limit: 20 } }));

  return (
    <div>
      <h1>Todos</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<p>Loading…</p>}>
          <TodoListClient />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
