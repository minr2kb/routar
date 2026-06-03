export default function Home() {
  return (
    <div>
      <h1>routar dev app</h1>
      <p>
        Internal testbed for the routar library. JSONPlaceholder as backend.
      </p>
      <ul>
        <li>
          <a href="/todos">
            Todos — SSR list + CSR mutations (create/update/delete)
          </a>
        </li>
        <li>
          <a href="/posts">
            Posts — SSR list, path param detail, nested comments
          </a>
        </li>
        <li>
          <a href="/posts/infinite">
            Posts (infinite) — SSR prefetch + useSuspenseInfiniteQuery + load
            more
          </a>
        </li>
        <li>
          <a href="/users">Users — CSR with adapter (flatten nested fields)</a>
        </li>
      </ul>
    </div>
  );
}
