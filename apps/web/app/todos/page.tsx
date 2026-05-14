import { todoServerApi } from '../../remote/services/index';
import { TodoListClient } from '../../components/TodoListClient';

export default async function TodosPage() {
  // SSR — fetch first 5 for above-the-fold preview
  const initialTodos = await todoServerApi.getList({ query: { _limit: 5 } });

  return (
    <div>
      <h1>Todos</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>SSR Preview (first 5)</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {initialTodos.map((todo) => (
            <li key={todo.id} style={{ padding: '2px 0', textDecoration: todo.completed ? 'line-through' : 'none', color: todo.completed ? '#999' : 'inherit' }}>
              [{todo.id}] {todo.label}
            </li>
          ))}
        </ul>
      </section>

      <TodoListClient />
    </div>
  );
}
