import { createParser } from "@routar/core";
import type { NextRequest } from "next/server";
import { CatalogRouter } from "@/remote/services/catalog";
import { badRequestFrom, created, ok } from "../../_lib/http";
import { createProduct, listProducts } from "../_store";

// Parsers derived from the shared router spec — the same schema the client
// enforces now validates the server too. No hand-rewritten request schemas, so
// contract and implementation can't drift apart.
const listParser = createParser(CatalogRouter.endpoints.products.endpoints.getList);
const createParserFor = createParser(CatalogRouter.endpoints.products.endpoints.create);

export async function GET(req: NextRequest) {
  try {
    const { query } = await listParser.parseRequest({
      query: Object.fromEntries(req.nextUrl.searchParams.entries()),
    });
    return ok(listProducts(query?.categoryId));
  } catch (err) {
    return badRequestFrom(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { body } = await createParserFor.parseRequest({
      body: await req.json(),
    });
    return created(createProduct(body));
  } catch (err) {
    return badRequestFrom(err);
  }
}
