"use client";

import { useSuspenseQueries } from "@tanstack/react-query";
import { postQuery } from "@/remote/services/post";

export function PostDetailClient({ id }: { id: number }) {
  // Two queries, one suspense boundary — the post and its comments together.
  const [{ data: post }, { data: comments }] = useSuspenseQueries({
    queries: [
      postQuery.getDetail({ path: { id } }),
      postQuery.getComments({ path: { id } }),
    ],
  });

  return (
    <article>
      <h1>{post.title}</h1>
      <p style={{ color: "#444" }}>{post.body}</p>
      <h3 style={{ marginTop: 24 }}>Comments ({comments.length})</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {comments.map((c) => (
          <li key={c.id} style={{ borderTop: "1px solid #eee", padding: "8px 0" }}>
            <strong>{c.name}</strong>{" "}
            <small style={{ color: "#999" }}>· {c.email}</small>
            <p style={{ margin: "4px 0 0" }}>{c.body}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
