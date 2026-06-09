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
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", gap: 8, marginBottom: 16 }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New todo title..."
        style={{ padding: "4px 8px", flex: 1 }}
      />
      <button type="submit" disabled={create.isPending}>
        {create.isPending ? "Adding…" : "Add"}
      </button>
      {create.isError && <span style={{ color: "red" }}>Failed</span>}
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
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 0",
      }}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() =>
          // flatten: true → flat vars; `id` (path) + `completed` (body) merged
          update.mutate({ id: todo.id, completed: !todo.completed })
        }
      />
      <span
        style={{
          flex: 1,
          textDecoration: todo.completed ? "line-through" : "none",
        }}
      >
        {todo.label}
      </span>
      <small style={{ color: "#999" }}>user {todo.userId}</small>
      <button
        type="button"
        onClick={() => remove.mutate({ id: todo.id })}
        disabled={remove.isPending}
        style={{
          color: "red",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        ✕
      </button>
    </li>
  );
}
