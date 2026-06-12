import Link from "next/link";

const DOMAINS = [
  { href: "/todos", name: "Todos", blurb: "local CRUD · flatten · auto-invalidating mutations · per-call options" },
  { href: "/posts", name: "Posts", blurb: "external API · SSR list · detail + comments · infinite scroll" },
  { href: "/users", name: "Users", blurb: "ArkType (Standard Schema) · adapter · validate: 'warn'" },
  { href: "/catalog", name: "Catalog", blurb: "ky executor · nested router · separated buckets · POST-as-query search" },
];

export default function Home() {
  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ marginBottom: 8 }}>routar example</h1>
      <p style={{ fontSize: 16, lineHeight: 1.5, color: "#333" }}>
        A small but realistic Next.js app. Each domain declares its API once in{" "}
        <code>remote/services/&lt;domain&gt;.ts</code> — router, schemas, client,
        and TanStack Query helpers together — and the pages just consume it.
      </p>
      <p style={{ color: "#666", fontSize: 14 }}>
        See <code>apps/example/README.md</code> for the folder layout and where
        each routar feature lives.
      </p>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 24 }}>
        {DOMAINS.map((d) => (
          <li key={d.href} style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
            <Link href={d.href} style={{ fontSize: 16 }}>
              {d.name}
            </Link>
            <div style={{ color: "#999", fontSize: 14 }}>{d.blurb}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
