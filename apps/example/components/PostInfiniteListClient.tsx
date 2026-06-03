"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { postQuery } from "@/remote/services/post";

export function PostInfiniteListClient() {
  // Contract comes from createQueries({ infinite }) — just pass base params.
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      postQuery.getList.infinite({ query: { _limit: 10 } }),
    );

  // data.pages is an array of pages; flatten to a single list
  const posts = data.pages.flat();

  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {posts.map((post) => (
          <li
            key={post.id}
            style={{ borderBottom: "1px solid #eee", padding: "12px 0" }}
          >
            <Link href={`/posts/${post.id}`}>
              <strong>[{post.id}]</strong> {post.title}
            </Link>
            <div style={{ color: "#666", fontSize: 14 }}>
              user {post.userId}
            </div>
          </li>
        ))}
      </ul>

      <div style={{ padding: "16px 0" }}>
        {hasNextPage ? (
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        ) : (
          <span style={{ color: "#999" }}>
            No more posts ({posts.length} total)
          </span>
        )}
      </div>
    </div>
  );
}
