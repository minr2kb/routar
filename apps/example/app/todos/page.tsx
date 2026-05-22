import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { TodoListClient } from "@/components/TodoListClient";
import { todoServerApi } from "@/remote/services";
import { todoListQueryOptions } from "@/remote/services/todo/todo.queries";
import { getQueryClient } from "@/utils/get-query-client";

export default async function TodosPage() {
  const queryClient = getQueryClient();

  const params = { query: { _limit: 20 } };

  await queryClient.prefetchQuery({
    ...todoListQueryOptions(params),
    queryFn: () => todoServerApi.getList(params),
  });

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
