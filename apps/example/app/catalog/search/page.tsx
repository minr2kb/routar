import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ProductSearchClient } from "@/components/ProductSearchClient";
import { catalogQuery } from "@/remote/services/catalog";
import { getQueryClient } from "@/utils/get-query-client";

export const dynamic = "force-dynamic";

export default async function ProductSearchPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchInfiniteQuery(
    catalogQuery.products.search.infinite({ body: { q: "" } }),
  );

  return (
    <div>
      <h1>Product search</h1>
      <p className="mb-5 mt-1 text-sm text-muted">
        POST-as-query (the search body is part of the query key) + infinite
        pagination.
      </p>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<p>Loading…</p>}>
          <ProductSearchClient />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
