import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { TodoListClient } from "@/components/TodoListClient";
import { todoQuery } from "@/remote/services/todo";
import { getQueryClient } from "@/utils/get-query-client";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const queryClient = getQueryClient();

  // flatten: true → flat params. The query key is built from the envelope, so
  // this prefetch key matches the CSR key in TodoListClient.
  const params = { _limit: 20 };

  await queryClient.prefetchQuery(todoQuery.getList(params));

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
