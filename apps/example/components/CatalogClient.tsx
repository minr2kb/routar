"use client";

import { useMutation, useSuspenseQueries } from "@tanstack/react-query";
import { useState } from "react";
import { catalogApi, catalogQuery, type Product } from "@/remote/services/catalog";

export function CatalogClient() {
  const [{ data: products }, { data: categories }] = useSuspenseQueries({
    queries: [catalogQuery.products.getList(), catalogQuery.categories.getList()],
  });
  const categoryName = (id: number) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <section>
      <NewProductForm firstCategoryId={categories[0]?.id ?? 1} />
      <ul className="divide-y divide-line">
        {products.map((p) => (
          <ProductRow key={p.id} product={p} category={categoryName(p.categoryId)} />
        ))}
      </ul>
    </section>
  );
}

function NewProductForm({ firstCategoryId }: { firstCategoryId: number }) {
  const [name, setName] = useState("");
  const create = useMutation({
    ...catalogQuery.products.create(), // invalidation comes from createQueries defaults
    // SE-10 — per-call options as the 2nd arg: a write deserves a timeout and an
    // idempotency key. Same vars shape as the generated mutationFn, so the
    // default `invalidates` still applies. (signal is wired by react-query.)
    mutationFn: (vars: { body: { name: string; price: number; categoryId: number } }) =>
      catalogApi.products.create(vars, {
        timeout: 8000,
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        create.mutate(
          { body: { name, price: 100, categoryId: firstCategoryId } },
          { onSuccess: () => setName("") },
        );
      }}
      className="mb-4 flex items-center gap-2"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New product name…"
        className="flex-1"
      />
      <button type="submit" disabled={create.isPending}>
        {create.isPending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}

function ProductRow({ product, category }: { product: Product; category: string }) {
  const update = useMutation(catalogQuery.products.update());
  const remove = useMutation(catalogQuery.products.remove());

  return (
    <li className="flex items-center gap-2 py-2">
      <span className="flex-1">
        {product.name} <small className="text-faint">· {category}</small>
      </span>
      <button
        type="button"
        // separated-bucket endpoint, composed at the call site: { path, body }
        onClick={() => update.mutate({ path: { id: product.id }, body: { price: product.price + 10 } })}
      >
        ${product.price} +10
      </button>
      <button
        type="button"
        onClick={() => remove.mutate({ path: { id: product.id } })}
        disabled={remove.isPending}
        className="border-none bg-transparent px-1 text-faint hover:text-danger"
      >
        ✕
      </button>
    </li>
  );
}
