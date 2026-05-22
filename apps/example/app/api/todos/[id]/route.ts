import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTodoById, updateTodo, deleteTodo } from '../_store';

const PatchSchema = z.object({
  title: z.string().optional(),
  completed: z.boolean().optional(),
});

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const todo = getTodoById(Number(id));
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(todo);
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await req.json();
  const result = PatchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }
  const todo = updateTodo(Number(id), result.data);
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(todo);
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const ok = deleteTodo(Number(id));
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
