import { createParser } from "@routar/core";
import type { NextRequest } from "next/server";
import { TodoRouter } from "@/remote/services/todo";
import { badRequestFrom, noContent, notFound, ok } from "../../_lib/http";
import { deleteTodo, getTodoById, updateTodo } from "../_store";

// Parsers derived from the shared router spec — `request.path` coerces the raw
// string `id` to a number, so there is no manual `Number(id)` or hand-written
// patch schema to drift from the client contract.
const detailParser = createParser(TodoRouter.endpoints.getDetail);
const updateParser = createParser(TodoRouter.endpoints.update);
const removeParser = createParser(TodoRouter.endpoints.remove);

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    const { path } = await detailParser.parseRequest({ path: { id } });
    const todo = getTodoById(path.id);
    return todo ? ok(todo) : notFound();
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
    const todo = updateTodo(path.id, body);
    return todo ? ok(todo) : notFound();
  } catch (err) {
    return badRequestFrom(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Params },
) {
  const { id } = await params;
  try {
    const { path } = await removeParser.parseRequest({ path: { id } });
    return deleteTodo(path.id) ? noContent() : notFound();
  } catch (err) {
    return badRequestFrom(err);
  }
}
