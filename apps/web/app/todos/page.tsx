import { todoServerApi } from '@/remote/services/todo/todo.api';

export default async function TodosPage() {
  const todos = await todoServerApi.getList({});

  return (
    <main>
      <h1>Todos</h1>
      <ul>
        {todos.slice(0, 10).map((todo) => (
          <li key={todo.id} style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
            [{todo.id}] {todo.title}
          </li>
        ))}
      </ul>
    </main>
  );
}
