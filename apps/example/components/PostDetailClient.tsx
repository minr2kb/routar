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
      <h1 className="mb-2">{post.title}</h1>
      <p className="leading-relaxed text-gray-700">{post.body}</p>
      <h3 className="mt-6">Comments ({comments.length})</h3>
      <ul className="divide-y divide-line border-t border-line">
        {comments.map((c) => (
          <li key={c.id} className="py-2">
            <strong>{c.name}</strong>{" "}
            <small className="text-faint">· {c.email}</small>
            <p className="mt-1 text-sm text-gray-700">{c.body}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
