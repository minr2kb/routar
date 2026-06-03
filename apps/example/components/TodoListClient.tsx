"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { todoQuery } from "@/remote/services/todo";
import { CreateTodoForm, TodoRow } from "./TodoMutations";

export function TodoListClient() {
  const [showCompleted, setShowCompleted] = useState<boolean | undefined>(
    undefined,
  );
  const params =
    showCompleted !== undefined
      ? { query: { completed: showCompleted, _limit: 20 } }
      : { query: { _limit: 20 } };
  const { data } = useSuspenseQuery(todoQuery.getList(params));

  return (
    <section>
      <h2>Todos (CSR)</h2>
      <CreateTodoForm />
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => setShowCompleted(undefined)}
          style={{
            fontWeight: showCompleted === undefined ? "bold" : "normal",
          }}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setShowCompleted(false)}
          style={{ fontWeight: showCompleted === false ? "bold" : "normal" }}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setShowCompleted(true)}
          style={{ fontWeight: showCompleted === true ? "bold" : "normal" }}
        >
          Completed
        </button>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {data.map((todo) => (
          <TodoRow key={todo.id} todo={todo} />
        ))}
      </ul>
    </section>
  );
}
