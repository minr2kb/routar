import { Image } from "nextra/components";
import { codeToHtml } from "shiki";
import { ComposableDemo } from "../../components/ComposableDemo";
import { PackageInstall } from "../../components/PackageInstall";

type Lang = "en" | "ko";

const t: Record<
  Lang,
  {
    tagline: string;
    description: string;
    getStarted: string;
    whyRoutar: string;
    features: { icon: string; title: string; desc: string }[];
    packages: { name: string; pkg: string; desc: string }[];
    navLinks: { label: string; href: string }[];
  }
> = {
  en: {
    tagline: "Schema-first · Type-safe · Transport-agnostic",
    description:
      "Define your API schema once —\nget end-to-end type safety and runtime validation\nacross any HTTP client and any environment.",
    getStarted: "Get Started →",
    whyRoutar: "Why routar?",
    features: [
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
    ],
    packages: [
      {
        name: "@routar/core",
        pkg: "@routar/core",
        desc: "Endpoint definitions, router, API client factory, fetch executor, and middleware.",
      },
      {
        name: "@routar/axios",
        pkg: "@routar/axios",
        desc: "Axios executor. Works with existing instances and interceptors.",
      },
      {
        name: "@routar/ky",
        pkg: "@routar/ky",
        desc: "ky executor. Lightweight fetch wrapper with hooks support.",
      },
      {
        name: "@routar/msw",
        pkg: "@routar/msw",
        desc: "MSW v2 handler factory — generate typed mock handlers from your RouterDef for testing.",
      },
      {
        name: "@routar/react-query",
        pkg: "@routar/react-query",
        desc: "TanStack Query bindings for routar — queryOptions/mutationOptions factories from a routar router",
      },
    ],
    navLinks: [
      { label: "Getting Started", href: "/en/getting-started" },
      { label: "Why routar?", href: "/en/why" },
      { label: "API Reference", href: "/en/api-reference" },
      { label: "Guides", href: "/en/guides/ssr-csr" },
    ],
  },
  ko: {
    tagline: "스키마 우선 · 타입 안전 · 트랜스포트 독립적",
    description:
      "API 스키마를 한 번 정의하고\n모든 HTTP 클라이언트와 모든 환경에서\n완전한 타입 안전성과 런타임 검증을 활용하세요.",
    getStarted: "시작하기 →",
    whyRoutar: "routar란?",
    features: [
      {
        icon: "🔒",
        title: "완전한 타입 추론",
        desc: "요청 파라미터와 응답 타입 — any 없이 모두 추론됩니다.",
      },
      {
        icon: "✅",
        title: "런타임 검증",
        desc: "Zod, Valibot, Yup, 또는 .parse() — 양쪽을 모두 검증합니다.",
      },
      {
        icon: "🔌",
        title: "트랜스포트 독립적",
        desc: "한 줄로 fetch나 Axios를 교체하세요. 스키마는 그대로입니다.",
      },
      {
        icon: "🧱",
        title: "미들웨어",
        desc: "재시도, 타임아웃, 로깅 — 쌓을 수 있고 조합 가능한 함수들.",
      },
      {
        icon: "🗂️",
        title: "중첩 라우터",
        desc: "URL 구조가 자연스럽게 타입 시스템에 반영됩니다.",
      },
      {
        icon: "🌐",
        title: "SSR / CSR 지원",
        desc: "동일한 스펙, 환경별 다른 executor.",
      },
    ],
    packages: [
      {
        name: "@routar/core",
        pkg: "@routar/core",
        desc: "엔드포인트 정의, 라우터, API 클라이언트 팩토리, fetch executor, 미들웨어.",
      },
      {
        name: "@routar/axios",
        pkg: "@routar/axios",
        desc: "Axios executor. 기존 인스턴스 및 인터셉터와 함께 작동합니다.",
      },
      {
        name: "@routar/ky",
        pkg: "@routar/ky",
        desc: "ky executor. 훅 지원이 있는 경량 fetch 래퍼.",
      },
      {
        name: "@routar/msw",
        pkg: "@routar/msw",
        desc: "MSW v2 핸들러 팩토리 — RouterDef에서 타입이 적용된 목 핸들러를 생성합니다.",
      },
      {
        name: "@routar/react-query",
        pkg: "@routar/react-query",
        desc: "TanStack Query 바인딩 — routar 라우터에서 타입이 적용된 queryOptions / mutationOptions 팩토리를 직접 파생합니다.",
      },
    ],
    navLinks: [
      { label: "시작하기", href: "/ko/getting-started" },
      { label: "routar란?", href: "/ko/why" },
      { label: "API 레퍼런스", href: "/ko/api-reference" },
      { label: "가이드", href: "/ko/guides/ssr-csr" },
    ],
  },
};

const CODE = `import { z } from 'zod'
import { endpoint, defineRouter, createApi, createFetchExecutor } from '@routar/core'

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

export default async function LandingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (lang === "ko" ? "ko" : "en") as Lang;
  const tr = t[locale];

  const highlighted = await codeToHtml(CODE, {
    lang: "typescript",
    theme: "github-dark",
  });

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
            {tr.tagline}
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
              whiteSpace: "pre-line",
            }}
          >
            {tr.description}
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
              href={tr.navLinks[0].href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "11px 26px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #6366f1 0%, #baa9f7 100%)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
                // boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
              }}
            >
              {tr.getStarted}
            </a>
            <a
              href={tr.navLinks[1].href}
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
              {tr.whyRoutar}
            </a>
          </div>

          <div style={{ maxWidth: "500px", margin: "0 auto" }}>
            <PackageInstall packages={["@routar/core"]} />
          </div>
        </div>
      </div>

      {/* ── Code ─────────────────────────────────────────── */}
      <div
        style={{ maxWidth: "780px", margin: "0 auto 80px", padding: "0 24px" }}
      >
        <div
          className="landing-code"
          style={{
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          }}
          // eslint-disable-next-line react/no-danger
          // biome-ignore lint/security/noDangerouslySetInnerHtml: code to html
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>

      {/* ── Composable Demo ──────────────────────────────── */}
      <ComposableDemo />

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
          {tr.features.map((f, i) => (
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
          {tr.packages.map((p) => (
            <div key={p.name} className="pkg-row">
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
          {tr.navLinks.map((link) => (
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
