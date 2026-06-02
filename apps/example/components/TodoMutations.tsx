"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { TodoItem } from "@/remote/services/todo";
import { todoQuery } from "@/remote/services/todo";

export function CreateTodoForm() {
  const [title, setTitle] = useState("");
  const create = useMutation(
    todoQuery.create({ invalidates: [todoQuery.$key] }),
  );

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
  const update = useMutation(
    todoQuery.update({ invalidates: [todoQuery.$key] }),
  );
  const remove = useMutation(
    todoQuery.remove({ invalidates: [todoQuery.$key] }),
  );

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
        onClick={() => remove.mutate({ path: { id: todo.id } })}
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
