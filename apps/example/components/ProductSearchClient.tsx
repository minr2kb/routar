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
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search products (empty = all)…"
          style={{ padding: "4px 8px", flex: 1 }}
        />
        <button type="submit">Search</button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {products.map((p) => (
          <li key={p.id} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
            {p.name} <small style={{ color: "#999" }}>· ${p.price}</small>
          </li>
        ))}
      </ul>

      {hasNextPage ? (
        <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      ) : (
        <span style={{ color: "#999" }}>{products.length} result(s)</span>
      )}
    </div>
  );
}
