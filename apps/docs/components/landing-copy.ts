export type Lang = "en" | "ko";

export function toLocale(lang: string): Lang {
  return lang === "ko" ? "ko" : "en";
}

export interface Feature {
  icon: string;
  title: string;
  desc: string;
}

export interface PackageCard {
  name: string;
  pkg: string;
  desc: string;
}

export interface NavLink {
  label: string;
  slug: string;
}

export interface ReactQueryPoint {
  title: string;
  desc: string;
}

export interface LandingCopy {
  tagline: string;
  description: string;
  getStarted: string;
  whyRoutar: string;
  features: Feature[];
  packages: PackageCard[];
  reactQuery: {
    eyebrow: string;
    title: string;
    subtitle: string;
    points: ReactQueryPoint[];
    note: string;
  };
  navLinks: NavLink[];
}

export const LANDING_COPY: Record<Lang, LandingCopy> = {
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
    reactQuery: {
      eyebrow: "@routar/react-query",
      title: "Options, not hooks",
      subtitle:
        "Most wrappers generate a useTodos() hook — callable only inside a component, one way.\nroutar derives queryOptions and mutationOptions straight from your router: plain objects you reuse anywhere.",
      points: [
        {
          title: "Reusable",
          desc: "One options object drives useQuery, useSuspenseQuery, prefetchQuery, and ensureQueryData — client or server.",
        },
        {
          title: "Lightweight",
          desc: "No generated hooks, no codegen step. Keys and queryFn are inferred from your schema — nothing to keep in sync.",
        },
        {
          title: "Composable",
          desc: "Spread and override per call: { ...todoQuery.getList(), staleTime }. Your defaults, your way.",
        },
      ],
      note: "Keys · queryFn · mutationFn — one source of truth, derived from api.",
    },
    navLinks: [
      { label: "Getting Started", slug: "getting-started" },
      { label: "Why routar?", slug: "why" },
      { label: "API Reference", slug: "api-reference" },
      { label: "Guides", slug: "guides/ssr-csr" },
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
    reactQuery: {
      eyebrow: "@routar/react-query",
      title: "hook이 아닌 options로 더 확장성있게",
      subtitle:
        "대부분의 래퍼는 useTodos() 훅을 생성합니다 — 컴포넌트 안에서, 한 가지 방식으로만 호출 가능하죠.\nroutar는 라우터에서 queryOptions·mutationOptions를 바로 파생합니다. 어디서든 재사용하는 평범한 객체로요.",
      points: [
        {
          title: "재사용",
          desc: "하나의 options 객체가 useQuery, useSuspenseQuery, prefetchQuery, ensureQueryData를 모두 구동합니다 — 클라이언트든 서버든.",
        },
        {
          title: "가벼움",
          desc: "생성된 훅도, 코드젠 단계도 없습니다. key와 queryFn은 스키마에서 추론되어 동기화할 게 없습니다.",
        },
        {
          title: "조합 가능",
          desc: "호출마다 펼쳐서 덮어쓰세요: { ...todoQuery.getList(), staleTime }. 기본값도 자유롭게.",
        },
      ],
      note: "key · queryFn · mutationFn — api에서 파생되는 단일 진실 공급원.",
    },
    navLinks: [
      { label: "시작하기", slug: "getting-started" },
      { label: "routar란?", slug: "why" },
      { label: "API 레퍼런스", slug: "api-reference" },
      { label: "가이드", slug: "guides/ssr-csr" },
    ],
  },
};
