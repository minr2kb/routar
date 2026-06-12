"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { postQuery } from "@/remote/services/post";

export function PostListClient() {
  const { data: posts } = useSuspenseQuery(postQuery.getList({ query: { _limit: 10 } }));

  return (
    <ul className="divide-y divide-line">
      {posts.map((post) => (
        <li key={post.id} className="py-3">
          <Link href={`/posts/${post.id}`}>
            <strong>[{post.id}]</strong> {post.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
