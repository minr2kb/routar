import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogClient } from "@/components/CatalogClient";
import { catalogQuery } from "@/remote/services/catalog";
import { getQueryClient } from "@/utils/get-query-client";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(catalogQuery.products.getList()),
    queryClient.prefetchQuery(catalogQuery.categories.getList()),
  ]);

  return (
    <div>
      <h1>Catalog</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        Nested router (products + categories) over the ky executor. See also{" "}
        <Link href="/catalog/search">product search</Link>.
      </p>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<p>Loading…</p>}>
          <CatalogClient />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
