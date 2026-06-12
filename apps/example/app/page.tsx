import Link from "next/link";

const DOMAINS = [
  { href: "/todos", name: "Todos", blurb: "local CRUD · flatten · auto-invalidating mutations · per-call options" },
  { href: "/posts", name: "Posts", blurb: "external API · SSR list · detail + comments · infinite scroll" },
  { href: "/users", name: "Users", blurb: "ArkType (Standard Schema) · adapter · validate: 'warn'" },
  { href: "/catalog", name: "Catalog", blurb: "ky executor · nested router · separated buckets · POST-as-query search" },
];

export default function Home() {
  return (
    <div>
      <h1 className="mb-2">routar example</h1>
      <p className="text-base leading-relaxed text-gray-700">
        A small but realistic Next.js app. Each domain declares its API once in{" "}
        <code>remote/services/&lt;domain&gt;.ts</code> — router, schemas, client,
        and TanStack Query helpers together — and the pages just consume it.
      </p>
      <p className="mt-1 text-sm text-muted">
        See <code>apps/example/README.md</code> for the folder layout and where
        each routar feature lives.
      </p>

      <ul className="mt-8 grid gap-3">
        {DOMAINS.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              className="block rounded-xl border border-line bg-white p-4 no-underline transition-shadow hover:shadow-sm"
            >
              <span className="text-base font-semibold text-ink">{d.name}</span>
              <div className="mt-1 text-sm text-faint">{d.blurb}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
