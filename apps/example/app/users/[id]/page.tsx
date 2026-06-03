import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { UserDetailClient } from "@/components/UserDetailClient";
import { postQuery } from "@/remote/services/post";
import { userQuery } from "@/remote/services/user";
import { getQueryClient } from "@/utils/get-query-client";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(userQuery.getDetail({ path: { id: userId } })),
    queryClient.prefetchQuery(
      postQuery.getList({ query: { userId, _limit: 5 } }),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<p>Loading…</p>}>
        <UserDetailClient id={userId} />
      </Suspense>
    </HydrationBoundary>
  );
}
