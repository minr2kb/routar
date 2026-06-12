"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { catalogQuery } from "@/remote/services/catalog";

export function ProductSearchClient() {
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState(""); // committed search — part of the query key

  // POST-as-query + infinite: the request body drives a cached, paginated query.
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(catalogQuery.products.search.infinite({ body: { q } }));

  const products = data.pages.flat();

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQ(draft);
        }}
        className="mb-4 flex items-center gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search products (empty = all)…"
          className="flex-1"
        />
        <button type="submit">Search</button>
      </form>

      <ul className="divide-y divide-line">
        {products.map((p) => (
          <li key={p.id} className="py-2">
            {p.name} <small className="text-faint">· ${p.price}</small>
          </li>
        ))}
      </ul>

      {hasNextPage ? (
        <button type="button" className="mt-4" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      ) : (
        <span className="mt-4 block text-sm text-faint">{products.length} result(s)</span>
      )}
    </div>
  );
}
