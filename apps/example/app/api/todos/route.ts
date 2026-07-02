import { createParser } from "@routar/core";
import type { NextRequest } from "next/server";
import { TodoRouter } from "@/remote/services/todo";
import { badRequestFrom, created, ok } from "../_lib/http";
import { createTodo, getAllTodos } from "./_store";

// Parsers derived from the shared router spec — the same schema the client
// enforces now validates the server too. No hand-rewritten request schemas, so
// contract and implementation can't drift apart.
const listParser = createParser(TodoRouter.endpoints.getList);
const createParserFor = createParser(TodoRouter.endpoints.create);

export async function GET(req: NextRequest) {
  try {
    const { query } = await listParser.parseRequest({
      query: Object.fromEntries(req.nextUrl.searchParams.entries()),
    });
    return ok(getAllTodos(query));
  } catch (err) {
    return badRequestFrom(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { body } = await createParserFor.parseRequest({
      body: await req.json(),
    });
    return created(createTodo(body));
  } catch (err) {
    return badRequestFrom(err);
  }
}
