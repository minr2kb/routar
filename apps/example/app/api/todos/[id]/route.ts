import type { NextRequest } from "next/server";
import { TodoRawSchema } from "@/remote/services/todo";
import { noContent, notFound, ok, parseBody } from "../../_lib/http";
import { deleteTodo, getTodoById, updateTodo } from "../_store";

const PatchBodySchema = TodoRawSchema.pick({
  title: true,
  completed: true,
}).partial();

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const todo = getTodoById(Number(id));
  return todo ? ok(todo) : notFound();
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const parsed = await parseBody(req, PatchBodySchema);
  if (!parsed.ok) return parsed.res;
  const todo = updateTodo(Number(id), parsed.data);
  return todo ? ok(todo) : notFound();
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Params },
) {
  const { id } = await params;
  return deleteTodo(Number(id)) ? noContent() : notFound();
}
