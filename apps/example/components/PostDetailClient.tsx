"use client";

import { useSuspenseQueries } from "@tanstack/react-query";
import {
  postCommentsQueryOptions,
  postDetailQueryOptions,
} from "@/remote/services/post/post.queries";

export function PostDetailClient({ id }: { id: number }) {
  const [{ data: post }, { data: comments }] = useSuspenseQueries({
    queries: [postDetailQueryOptions(id), postCommentsQueryOptions(id)],
  });

  return (
    <div>
      <h1>{post.title}</h1>
      <p style={{ color: "#666", fontSize: 14 }}>by user {post.userId}</p>
      <p>{post.body}</p>
      <hr />
      <h2>Comments ({comments.length})</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {comments.map((c) => (
          <li
            key={c.id}
            style={{ borderBottom: "1px solid #eee", padding: "12px 0" }}
          >
            <strong>{c.name}</strong>
            <span style={{ color: "#666", fontSize: 13 }}>
              {" "}
              &lt;{c.email}&gt;
            </span>
            <p style={{ margin: "4px 0 0", color: "#444" }}>{c.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
