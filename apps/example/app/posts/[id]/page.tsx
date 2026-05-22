import { postServerApi } from '../../../remote/services/index';

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id);

  const [post, comments] = await Promise.all([
    postServerApi.getDetail({ path: { id: postId } }),
    postServerApi.getComments({ path: { id: postId } }),
  ]);

  return (
    <div>
      <h1>{post.title}</h1>
      <p style={{ color: '#666', fontSize: 14 }}>by user {post.userId}</p>
      <p>{post.body}</p>

      <hr />
      <h2>Comments ({comments.length})</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {comments.map((c) => (
          <li key={c.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
            <strong>{c.name}</strong>
            <span style={{ color: '#666', fontSize: 13 }}> &lt;{c.email}&gt;</span>
            <p style={{ margin: '4px 0 0', color: '#444' }}>{c.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
