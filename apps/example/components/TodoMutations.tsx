"use client";

import { useState } from "react";
import type { TodoItem } from "@/remote/services/todo/todo.api";
import {
  useCreateTodo,
  useDeleteTodo,
  useUpdateTodo,
} from "../remote/services/todo/todo.queries";

export function CreateTodoForm() {
  const [title, setTitle] = useState("");
  const create = useCreateTodo();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate(
      { body: { title, completed: false, userId: 1 } },
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
  const update = useUpdateTodo();
  const remove = useDeleteTodo();

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
          update.mutate({
            path: { id: todo.id },
            body: { completed: !todo.completed },
          })
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
        onClick={() => remove.mutate(todo.id)}
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
