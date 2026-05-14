import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>routar dev app</h1>
      <nav>
        <Link href="/todos">Todos (SSR)</Link>
      </nav>
    </main>
  );
}
