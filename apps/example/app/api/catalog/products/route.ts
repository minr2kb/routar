import type { NextRequest } from "next/server";
import { z } from "zod";
import { created, ok, parseBody, parseQuery } from "../../_lib/http";
import { createProduct, listProducts } from "../_store";

const ListQuery = z.object({ categoryId: z.coerce.number().optional() });
const CreateBody = z.object({
  name: z.string(),
  price: z.number(),
  categoryId: z.number(),
});

export function GET(req: NextRequest) {
  const parsed = parseQuery(req.nextUrl.searchParams, ListQuery);
  if (!parsed.ok) return parsed.res;
  return ok(listProducts(parsed.data.categoryId));
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, CreateBody);
  if (!parsed.ok) return parsed.res;
  return created(createProduct(parsed.data));
}
