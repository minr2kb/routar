import { createParser } from "@routar/core";
import type { NextRequest } from "next/server";
import { CatalogRouter } from "@/remote/services/catalog";
import { badRequestFrom, ok } from "../../../_lib/http";
import { searchProducts } from "../../_store";

// POST-as-query: the search criteria live in the request body. A static segment
// (`/search`) takes precedence over the sibling `[id]` dynamic route. The parser
// comes from the shared router spec, so the body contract can't drift.
const searchParser = createParser(CatalogRouter.endpoints.products.endpoints.search);

export async function POST(req: NextRequest) {
  try {
    const { body } = await searchParser.parseRequest({ body: await req.json() });
    return ok(searchProducts(body.q, body._page, body._limit));
  } catch (err) {
    return badRequestFrom(err);
  }
}
