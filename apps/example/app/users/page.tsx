import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { UserListClient } from "@/components/UserListClient";
import { userQuery } from "@/remote/services/user";
import { getQueryClient } from "@/utils/get-query-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(userQuery.getList());

  return (
    <div>
      <h1>Users</h1>
      <p className="mb-5 mt-1 text-sm text-muted">
        ArkType (Standard Schema) response + <code>adapter</code> flattening{" "}
        <code>company.name → companyName</code>, <code>address.city → city</code>.
      </p>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<p>Loading…</p>}>
          <UserListClient />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
