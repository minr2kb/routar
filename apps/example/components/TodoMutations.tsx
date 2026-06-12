"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { TodoItem } from "@/remote/services/todo";
import { todoQuery } from "@/remote/services/todo";

export function CreateTodoForm() {
  const [title, setTitle] = useState("");
  // `invalidates` comes from the dynamic default in createQueries — no need to
  // repeat it here.
  const create = useMutation(todoQuery.create());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    // flatten: true → flat vars (no `body` envelope)
    create.mutate(
      { title, completed: false, userId: 1 },
      { onSuccess: () => setTitle("") },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New todo title..."
        className="flex-1"
      />
      <button type="submit" disabled={create.isPending}>
        {create.isPending ? "Adding…" : "Add"}
      </button>
      {create.isError && <span className="text-sm text-danger">Failed</span>}
    </form>
  );
}

export function TodoRow({ todo }: { todo: TodoItem }) {
  // `update` invalidates a narrow key explicitly (per-call wins over any default);
  // `remove` relies on the dynamic default declared in createQueries.
  const update = useMutation(
    todoQuery.update({ invalidates: [todoQuery.getList.queryKey()] }),
  );
  const remove = useMutation(todoQuery.remove());

  return (
    <li className="flex items-center gap-3 py-2">
      <input
        type="checkbox"
        className="size-4 accent-brand"
        checked={todo.completed}
        onChange={() =>
          // flatten: true → flat vars; `id` (path) + `completed` (body) merged
          update.mutate({ id: todo.id, completed: !todo.completed })
        }
      />
      <span
        className={`flex-1 ${todo.completed ? "text-faint line-through" : ""}`}
      >
        {todo.label}
      </span>
      <small className="text-faint">user {todo.userId}</small>
      <button
        type="button"
        onClick={() => remove.mutate({ id: todo.id })}
        disabled={remove.isPending}
        className="border-none bg-transparent px-1 text-faint hover:text-danger"
      >
        ✕
      </button>
    </li>
  );
}
