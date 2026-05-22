'use client';

import { useState } from 'react';
import { useTodoList } from '../remote/services/todo/todo.queries';
import { CreateTodoForm, TodoRow } from './TodoMutations';

export function TodoListClient() {
  const [showCompleted, setShowCompleted] = useState<boolean | undefined>(undefined);
  const { data, isLoading, isError } = useTodoList(
    showCompleted !== undefined ? { query: { completed: showCompleted, _limit: 20 } } : { query: { _limit: 20 } },
  );

  return (
    <section>
      <h2>Todos (CSR)</h2>
      <CreateTodoForm />
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <button onClick={() => setShowCompleted(undefined)} style={{ fontWeight: showCompleted === undefined ? 'bold' : 'normal' }}>All</button>
        <button onClick={() => setShowCompleted(false)} style={{ fontWeight: showCompleted === false ? 'bold' : 'normal' }}>Active</button>
        <button onClick={() => setShowCompleted(true)} style={{ fontWeight: showCompleted === true ? 'bold' : 'normal' }}>Completed</button>
      </div>
      {isLoading && <p>Loading…</p>}
      {isError && <p style={{ color: 'red' }}>Error loading todos</p>}
      {data && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {data.map((todo) => (
            <TodoRow key={todo.id} todo={todo} />
          ))}
        </ul>
      )}
    </section>
  );
}
