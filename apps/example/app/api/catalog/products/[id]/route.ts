import { createParser } from "@routar/core";
import type { NextRequest } from "next/server";
import { CatalogRouter } from "@/remote/services/catalog";
import { badRequestFrom, noContent, notFound, ok } from "../../../_lib/http";
import { deleteProduct, getProduct, updateProduct } from "../../_store";

// Parsers derived from the shared router spec — `request.path` coerces the raw
// string `id` to a number, so there is no manual `Number(id)` or hand-written
// patch schema to drift from the client contract.
const detailParser = createParser(CatalogRouter.endpoints.products.endpoints.getDetail);
const updateParser = createParser(CatalogRouter.endpoints.products.endpoints.update);
const removeParser = createParser(CatalogRouter.endpoints.products.endpoints.remove);

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const { path } = await detailParser.parseRequest({ path: { id } });
    const product = getProduct(path.id);
    return product ? ok(product) : notFound();
  } catch (err) {
    return badRequestFrom(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const { path, body } = await updateParser.parseRequest({
      path: { id },
      body: await req.json(),
    });
    const product = updateProduct(path.id, body);
    return product ? ok(product) : notFound();
  } catch (err) {
    return badRequestFrom(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const { path } = await removeParser.parseRequest({ path: { id } });
    return deleteProduct(path.id) ? noContent() : notFound();
  } catch (err) {
    return badRequestFrom(err);
  }
}
