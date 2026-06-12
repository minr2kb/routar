import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, parseBody } from "../../../_lib/http";
import { searchProducts } from "../../_store";

// POST-as-query: the search criteria live in the request body. A static segment
// (`/search`) takes precedence over the sibling `[id]` dynamic route.
const SearchBody = z.object({
  q: z.string(),
  _page: z.number().optional(),
  _limit: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, SearchBody);
  if (!parsed.ok) return parsed.res;
  const { q, _page, _limit } = parsed.data;
  return ok(searchProducts(q, _page, _limit));
}
