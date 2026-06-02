"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { postQuery } from "@/remote/services/post/post.queries";

export function PostListClient() {
  const { data: posts } = useSuspenseQuery(
    postQuery.getList({ query: { _limit: 10 } }),
  );

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {posts.map((post) => (
        <li
          key={post.id}
          style={{ borderBottom: "1px solid #eee", padding: "12px 0" }}
        >
          <Link href={`/posts/${post.id}`}>
            <strong>[{post.id}]</strong> {post.title}
          </Link>
          <div style={{ color: "#666", fontSize: 14 }}>user {post.userId}</div>
        </li>
      ))}
    </ul>
  );
}
