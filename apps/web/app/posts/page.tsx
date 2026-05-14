import { postServerApi } from '../../remote/services/index';
import Link from 'next/link';

export default async function PostsPage() {
  const posts = await postServerApi.getList({ query: { _limit: 10 } });

  return (
    <div>
      <h1>Posts (SSR)</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {posts.map((post) => (
          <li key={post.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
            <Link href={`/posts/${post.id}`}>
              <strong>[{post.id}]</strong> {post.title}
            </Link>
            <div style={{ color: '#666', fontSize: 14 }}>user {post.userId}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
