import type { z } from "zod";
import type { TodoRawSchema } from "@/remote/services/todo/todo.api";

type TodoRaw = z.infer<typeof TodoRawSchema>;

let nextId = 11;

const store: TodoRaw[] = [
  { id: 1, userId: 1, title: "Buy groceries", completed: false },
  { id: 2, userId: 1, title: "Walk the dog", completed: true },
  { id: 3, userId: 1, title: "Read a book", completed: false },
  { id: 4, userId: 2, title: "Write tests", completed: false },
  { id: 5, userId: 2, title: "Deploy to production", completed: true },
  { id: 6, userId: 2, title: "Fix the bug", completed: true },
  { id: 7, userId: 1, title: "Review PR", completed: false },
  { id: 8, userId: 3, title: "Update docs", completed: false },
  { id: 9, userId: 3, title: "Ship the feature", completed: true },
  { id: 10, userId: 3, title: "Write changelog", completed: false },
];

export function getAllTodos(opts?: {
  userId?: number;
  completed?: boolean;
  _limit?: number;
  _page?: number;
}): TodoRaw[] {
  let result = store.slice();
  if (opts?.userId !== undefined)
    result = result.filter((t) => t.userId === opts.userId);
  if (opts?.completed !== undefined)
    result = result.filter((t) => t.completed === opts.completed);
  if (opts?._page !== undefined && opts?._limit !== undefined) {
    const start = (opts._page - 1) * opts._limit;
    result = result.slice(start, start + opts._limit);
  } else if (opts?._limit !== undefined) {
    result = result.slice(0, opts._limit);
  }
  return result;
}

export function getTodoById(id: number): TodoRaw | undefined {
  return store.find((t) => t.id === id);
}

export function createTodo(data: Omit<TodoRaw, "id">): TodoRaw {
  const todo: TodoRaw = { id: nextId++, ...data };
  store.push(todo);
  return todo;
}

export function updateTodo(
  id: number,
  patch: Partial<Omit<TodoRaw, "id">>,
): TodoRaw | null {
  const idx = store.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  store[idx] = { ...store[idx], ...patch };
  return store[idx];
}

export function deleteTodo(id: number): boolean {
  const idx = store.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  return true;
}
