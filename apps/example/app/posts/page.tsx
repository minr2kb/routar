import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import Link from "next/link";
import { Suspense } from "react";
import { PostListClient } from "@/components/PostListClient";
import { postQuery } from "@/remote/services/post";
import { getQueryClient } from "@/utils/get-query-client";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(postQuery.getList({ query: { _limit: 10 } }));

  return (
    <div>
      <h1>Posts</h1>
      <p className="mb-5 mt-1 text-sm text-muted">
        SSR-prefetched list over the external API. See also{" "}
        <Link href="/posts/infinite">infinite scroll</Link>.
      </p>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<p>Loading…</p>}>
          <PostListClient />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
