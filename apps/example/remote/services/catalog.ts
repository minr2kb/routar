import { createApi, defineRouter, endpoint } from "@routar/core";
import { createQueries } from "@routar/react-query";
import { z } from "zod";
import { localKyExecutor } from "../lib/executors/ky";

const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  categoryId: z.number(),
});
const CategorySchema = z.object({ id: z.number(), name: z.string() });

const PER_PAGE = 5;

// Nested router — `products` and `categories` are sub-routers under `/catalog`,
// reached through the ky executor (remote/lib/executors/ky.ts). The client
// mirrors the shape: catalogApi.products.getList(), catalogApi.categories.getList().
export const CatalogRouter = defineRouter("/catalog", {
  products: defineRouter("/products", {
    getList: endpoint({
      method: "GET",
      path: "/",
      request: {
        query: z.object({ categoryId: z.coerce.number().optional() }).optional(),
      },
      response: z.array(ProductSchema),
    }),
    getDetail: endpoint({
      method: "GET",
      path: "/:id",
      request: { path: z.object({ id: z.coerce.number() }) },
      response: ProductSchema,
    }),
    // SE-12 — separated request buckets: `body` (and `pathParams`) are declared
    // as standalone validators; routar composes them into the usual envelope.
    create: endpoint({
      method: "POST",
      path: "/",
      request: {
        body: z.object({ name: z.string().min(1), price: z.number().positive(), categoryId: z.number() }),
      },
      response: ProductSchema,
    }),
    update: endpoint({
      method: "PATCH",
      path: "/:id",
      request: {
        path: z.object({ id: z.coerce.number() }),
        body: z.object({ name: z.string().optional(), price: z.number().optional() }),
      },
      response: ProductSchema,
    }),
    remove: endpoint({
      method: "DELETE",
      path: "/:id",
      request: { path: z.object({ id: z.coerce.number() }) },
      response: z.unknown(),
    }),
    // A POST whose body is the search query — promoted to a query accessor below.
    search: endpoint({
      method: "POST",
      path: "/search",
      request: {
        body: z.object({ q: z.string(), _page: z.number().optional(), _limit: z.number().optional() }),
      },
      response: z.array(ProductSchema),
    }),
  }),
  categories: defineRouter("/categories", {
    getList: endpoint({ method: "GET", path: "/", response: z.array(CategorySchema) }),
  }),
});

export const catalogApi = createApi(localKyExecutor, CatalogRouter);

export const catalogQuery = createQueries(catalogApi, {
  // SE-9 — promote the non-GET `search` endpoint to a query accessor (its body
  // joins the query key) and expose `.infinite` on it.
  queryEndpoints: { products: { search: true } },
  infinite: {
    products: {
      search: {
        initialPageParam: 1,
        getNextPageParam: (last, pages) => (last.length === PER_PAGE ? pages.length + 1 : undefined),
        pageParam: (page) => ({ body: { _page: page, _limit: PER_PAGE } }),
      },
    },
  },
  defaults: {
    products: {
      getList: { staleTime: 60_000 }, // static default
      // dynamic default — refresh the list after any write
      create: (_, q) => ({ invalidates: [q.products.getList.queryKey()] }),
      update: (_, q) => ({ invalidates: [q.products.getList.queryKey()] }),
      remove: (_, q) => ({ invalidates: [q.products.getList.queryKey()] }),
    },
  },
});

export type Product = z.infer<typeof ProductSchema>;
export type Category = z.infer<typeof CategorySchema>;
