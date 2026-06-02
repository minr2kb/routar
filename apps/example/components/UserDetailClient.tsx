"use client";

import { useSuspenseQueries } from "@tanstack/react-query";
import Link from "next/link";
import { postQuery } from "@/remote/services/post/post.queries";
import { userQuery } from "@/remote/services/user/user.queries";

export function UserDetailClient({ id }: { id: number }) {
  const [{ data: user }, { data: posts }] = useSuspenseQueries({
    queries: [
      userQuery.getDetail({ path: { id } }),
      postQuery.getList({ query: { userId: id, _limit: 5 } }),
    ],
  });

  return (
    <div>
      <h1>{user.name}</h1>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "4px 16px",
        }}
      >
        <dt>Username</dt>
        <dd>{user.username}</dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>Phone</dt>
        <dd>{user.phone}</dd>
        <dt>Company</dt>
        <dd>{user.companyName}</dd>
        <dt>City</dt>
        <dd>{user.city}</dd>
      </dl>
      <h2 style={{ marginTop: 24 }}>Recent Posts</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {posts.map((post) => (
          <li
            key={post.id}
            style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}
          >
            <Link href={`/posts/${post.id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
