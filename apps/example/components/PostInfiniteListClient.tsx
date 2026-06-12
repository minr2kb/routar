"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { postQuery } from "@/remote/services/post";

export function PostInfiniteListClient() {
  // Contract comes from createQueries({ infinite }) — pass base params only.
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(postQuery.getList.infinite({ query: { _limit: 10 } }));

  const posts = data.pages.flat();

  return (
    <div>
      <ul className="divide-y divide-line">
        {posts.map((post) => (
          <li key={post.id} className="py-3">
            <Link href={`/posts/${post.id}`}>
              <strong>[{post.id}]</strong> {post.title}
            </Link>
          </li>
        ))}
      </ul>
      <div className="py-4">
        {hasNextPage ? (
          <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        ) : (
          <span className="text-sm text-faint">No more posts ({posts.length} total)</span>
        )}
      </div>
    </div>
  );
}
