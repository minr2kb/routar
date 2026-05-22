import { NextRequest, NextResponse } from 'next/server';
import { getAllTodos, createTodo } from './_store';
import { TodoRawSchema } from '@/remote/services/todo/todo.api';

const CreateBodySchema = TodoRawSchema.omit({ id: true });

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const userId = sp.has('userId') ? Number(sp.get('userId')) : undefined;
  const completed = sp.has('completed') ? sp.get('completed') === 'true' : undefined;
  const _limit = sp.has('_limit') ? Number(sp.get('_limit')) : undefined;
  const _page = sp.has('_page') ? Number(sp.get('_page')) : undefined;

  return NextResponse.json(getAllTodos({ userId, completed, _limit, _page }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = CreateBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }
  return NextResponse.json(createTodo(result.data), { status: 201 });
}
