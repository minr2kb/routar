"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { todoQuery } from "@/remote/services/todo";
import { CreateTodoForm, TodoRow } from "./TodoMutations";

export function TodoListClient() {
  const [showCompleted, setShowCompleted] = useState<boolean | undefined>(
    undefined,
  );
  // flatten: true → flat params (no `query` envelope). The query key is still
  // built from the envelope, so this matches the SSR prefetch key in page.tsx.
  const params =
    showCompleted !== undefined
      ? { completed: showCompleted, _limit: 20 }
      : { _limit: 20 };
  const { data } = useSuspenseQuery(todoQuery.getList(params));

  const filterBtn = (active: boolean) =>
    active ? "border-brand font-semibold text-brand-fg" : "";

  return (
    <section>
      <h2 className="mb-3">Todos (CSR)</h2>
      <CreateTodoForm />
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setShowCompleted(undefined)}
          className={filterBtn(showCompleted === undefined)}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setShowCompleted(false)}
          className={filterBtn(showCompleted === false)}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setShowCompleted(true)}
          className={filterBtn(showCompleted === true)}
        >
          Completed
        </button>
      </div>
      <ul className="divide-y divide-line">
        {data.map((todo) => (
          <TodoRow key={todo.id} todo={todo} />
        ))}
      </ul>
    </section>
  );
}
