import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { PostInfiniteListClient } from "@/components/PostInfiniteListClient";
import { postQuery } from "@/remote/services/post";
import { getQueryClient } from "@/utils/get-query-client";

export const dynamic = "force-dynamic";

export default async function PostsInfinitePage() {
  const queryClient = getQueryClient();

  // SSR: prefetch the first page. Same base params as the client → matching key.
  await queryClient.prefetchInfiniteQuery(
    postQuery.getList.infinite({ query: { _limit: 10 } }),
  );

  return (
    <div>
      <h1>Posts — infinite</h1>
      <p style={{ color: "#666" }}>
        SSR-prefetched first page, then <code>fetchNextPage()</code> via{" "}
        <code>useSuspenseInfiniteQuery</code>.
      </p>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<p>Loading…</p>}>
          <PostInfiniteListClient />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
