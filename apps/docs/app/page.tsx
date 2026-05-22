import { PackageInstall } from "../components/PackageInstall";

const FEATURES = [
  {
    icon: "🔒",
    title: "End-to-end types",
    desc: "Request params and response shape — all inferred without any.",
  },
  {
    icon: "✅",
    title: "Runtime validation",
    desc: "Zod, Valibot, Yup, or any .parse() — validates both sides.",
  },
  {
    icon: "🔌",
    title: "Transport agnostic",
    desc: "Swap fetch or Axios in one line. Schema stays the same.",
  },
  {
    icon: "🧱",
    title: "Middleware",
    desc: "Retry, timeout, logging — stackable, composable functions.",
  },
  {
    icon: "🗂️",
    title: "Nested routers",
    desc: "URL structure mirrors the type system naturally.",
  },
  {
    icon: "🌐",
    title: "SSR / CSR ready",
    desc: "Same spec, different executor per environment.",
  },
];

const PACKAGES = [
  {
    name: "@routar/core",
    pkg: "@routar/core",
    desc: "Endpoint definitions, router, API client factory, middleware.",
  },
  {
    name: "@routar/fetch",
    pkg: "@routar/fetch",
    desc: "Native fetch executor. Zero extra dependencies.",
  },
  {
    name: "@routar/axios",
    pkg: "@routar/axios",
    desc: "Axios executor. Works with existing instances and interceptors.",
  },
];

const CODE = `import { z } from 'zod'
import { endpoint, defineRouter, createApi } from '@routar/core'
import { createFetchExecutor } from '@routar/fetch'

const TodoSchema = z.object({ id: z.number(), title: z.string(), done: z.boolean() })

const api = createApi(createFetchExecutor('https://api.example.com'), defineRouter('/todos', {
  list:   endpoint({ method: 'GET',  path: '/',    response: z.array(TodoSchema) }),
  detail: endpoint({ method: 'GET',  path: '/:id', response: TodoSchema,
                     request: z.object({ path: z.object({ id: z.number() }) }) }),
  create: endpoint({ method: 'POST', path: '/',    response: TodoSchema,
                     request: z.object({ body: z.object({ title: z.string() }) }) }),
}))

const todos = await api.list({})                              // Todo[]
const todo  = await api.detail({ path: { id: 1 } })          // Todo
const next  = await api.create({ body: { title: 'buy milk' } }) // Todo`;

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", padding: "0 0 96px" }}>
      {/* ── Hero ─────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          textAlign: "center",
          padding: "96px 24px 80px",
          background: `
          radial-gradient(ellipse 60% 50% at 30% 0%, rgba(99,102,241,0.15) 0%, transparent 70%),
          radial-gradient(ellipse 50% 40% at 75% 10%, rgba(168,85,247,0.12) 0%, transparent 70%)
        `,
        }}
      >
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              padding: "5px 14px",
              borderRadius: "999px",
              border: "1px solid rgba(99,102,241,0.3)",
              background: "rgba(99,102,241,0.07)",
              color: "rgb(99,102,241)",
              marginBottom: "32px",
            }}
          >
            Schema-first · Type-safe · Transport-agnostic
          </div>

          <h1
            style={{
              fontSize: "clamp(3.5rem, 10vw, 6rem)",
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: "-0.04em",
              marginBottom: "20px",
              background:
                "linear-gradient(135deg, #6366f1 0%, #a78bfa 55%, #c4b5fd 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            routar
          </h1>

          <p
            style={{
              fontSize: "1.15rem",
              lineHeight: 1.75,
              color: "#6b7280",
              marginBottom: "40px",
            }}
          >
            Define your API schema once —<br />
            get end-to-end type safety and runtime validation
            <br />
            across any HTTP client and any environment.
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "40px",
            }}
          >
            <a
              href="/getting-started"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "11px 26px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
              }}
            >
              Get Started →
            </a>
            <a
              href="/why"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "11px 26px",
                borderRadius: "10px",
                border: "1px solid rgba(99,102,241,0.3)",
                color: "rgb(99,102,241)",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              Why routar?
            </a>
          </div>

          <div style={{ maxWidth: "500px", margin: "0 auto" }}>
            <PackageInstall packages={["@routar/core", "@routar/fetch"]} />
          </div>
        </div>
      </div>

      {/* ── Code ─────────────────────────────────────────── */}
      <div
        style={{ maxWidth: "780px", margin: "0 auto 80px", padding: "0 24px" }}
      >
        <pre
          style={{
            background: "#0f1117",
            borderRadius: "14px",
            padding: "28px 32px",
            overflowX: "auto",
            fontSize: "0.82rem",
            lineHeight: 1.7,
            color: "#e2e8f0",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            margin: 0,
          }}
        >
          <code>{CODE}</code>
        </pre>
      </div>

      {/* ── Features ─────────────────────────────────────── */}
      <div
        style={{ maxWidth: "780px", margin: "0 auto 80px", padding: "0 24px" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              style={{
                padding: "26px 22px",
                background:
                  i % 2 === 0 ? "rgba(99,102,241,0.025)" : "transparent",
                borderRight:
                  i % 3 !== 2 ? "1px solid rgba(0,0,0,0.06)" : undefined,
                borderBottom: i < 3 ? "1px solid rgba(0,0,0,0.06)" : undefined,
              }}
            >
              <div style={{ fontSize: "1.35rem", marginBottom: "10px" }}>
                {f.icon}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  marginBottom: "6px",
                }}
              >
                {f.title}
              </div>
              <div
                style={{
                  fontSize: "0.81rem",
                  lineHeight: 1.65,
                  color: "#6b7280",
                }}
              >
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Packages ─────────────────────────────────────── */}
      <div
        style={{ maxWidth: "780px", margin: "0 auto 80px", padding: "0 24px" }}
      >
        <p
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "#9ca3af",
            marginBottom: "16px",
          }}
        >
          Packages
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {PACKAGES.map((p) => (
            <div
              key={p.name}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                alignItems: "center",
                gap: "24px",
                padding: "18px 22px",
                borderRadius: "12px",
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <div>
                <code
                  style={{
                    fontWeight: 700,
                    fontSize: "0.84rem",
                    color: "rgb(99,102,241)",
                  }}
                >
                  {p.name}
                </code>
                <div
                  style={{
                    fontSize: "0.77rem",
                    color: "#9ca3af",
                    marginTop: "4px",
                    lineHeight: 1.5,
                  }}
                >
                  {p.desc}
                </div>
              </div>
              <PackageInstall packages={p.pkg} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Nav links ────────────────────────────────────── */}
      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "10px",
          }}
        >
          {[
            { label: "Getting Started", href: "/getting-started" },
            { label: "Why routar?", href: "/why" },
            { label: "API Reference", href: "/api-reference" },
            { label: "Guides", href: "/guides/ssr-csr" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                display: "block",
                padding: "16px 20px",
                borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.08)",
                fontWeight: 600,
                fontSize: "0.88rem",
                color: "inherit",
                textDecoration: "none",
                transition: "border-color 0.15s",
              }}
            >
              {link.label} →
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
