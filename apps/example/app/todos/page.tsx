import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { TodoListClient } from "@/components/TodoListClient";
import { todoQuery } from "@/remote/services/todo";
import { getQueryClient } from "@/utils/get-query-client";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(todoQuery.getList({ _limit: 20 }));

  return (
    <div>
      <h1>Todos</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        Local CRUD over Next route handlers (fetch executor). Mutations
        auto-invalidate the list via <code>createQueries</code> defaults.
      </p>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<p>Loading…</p>}>
          <TodoListClient />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
