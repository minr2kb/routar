import type { NextRequest } from "next/server";
import { z } from "zod";
import { noContent, notFound, ok, parseBody } from "../../../_lib/http";
import { deleteProduct, getProduct, updateProduct } from "../../_store";

const PatchBody = z.object({ name: z.string(), price: z.number() }).partial();

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const product = getProduct(Number(id));
  return product ? ok(product) : notFound();
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const parsed = await parseBody(req, PatchBody);
  if (!parsed.ok) return parsed.res;
  const product = updateProduct(Number(id), parsed.data);
  return product ? ok(product) : notFound();
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  return deleteProduct(Number(id)) ? noContent() : notFound();
}
