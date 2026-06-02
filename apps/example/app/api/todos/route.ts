import type { NextRequest } from "next/server";
import { z } from "zod";
import { TodoRawSchema } from "@/remote/services/todo";
import { created, ok, parseBody, parseQuery } from "../_lib/http";
import { createTodo, getAllTodos } from "./_store";

const ListQuerySchema = z.object({
  userId: z.coerce.number().optional(),
  completed: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  _limit: z.coerce.number().optional(),
  _page: z.coerce.number().optional(),
});

const CreateBodySchema = TodoRawSchema.omit({ id: true });

export function GET(req: NextRequest) {
  const parsed = parseQuery(req.nextUrl.searchParams, ListQuerySchema);
  if (!parsed.ok) return parsed.res;
  return ok(getAllTodos(parsed.data));
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, CreateBodySchema);
  if (!parsed.ok) return parsed.res;
  return created(createTodo(parsed.data));
}
