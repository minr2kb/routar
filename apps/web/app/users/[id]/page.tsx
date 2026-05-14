import { userServerApi, postServerApi } from '../../../remote/services/index';
import Link from 'next/link';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);

  const [user, posts] = await Promise.all([
    userServerApi.getDetail({ path: { id: userId } }),
    postServerApi.getList({ query: { userId, _limit: 5 } }),
  ]);

  return (
    <div>
      <h1>{user.name}</h1>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px' }}>
        <dt>Username</dt><dd>{user.username}</dd>
        <dt>Email</dt><dd>{user.email}</dd>
        <dt>Phone</dt><dd>{user.phone}</dd>
        <dt>Company</dt><dd>{user.companyName}</dd>
        <dt>City</dt><dd>{user.city}</dd>
      </dl>

      <h2 style={{ marginTop: 24 }}>Recent Posts</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {posts.map((post) => (
          <li key={post.id} style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
            <Link href={`/posts/${post.id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
