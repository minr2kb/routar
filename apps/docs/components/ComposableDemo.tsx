"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { LandingSection } from "./LandingSection";

// ── Types ──────────────────────────────────────────────────────────────────

type RouterKey = "todo" | "post" | "user";
type Factory = "createApi" | "createMswHandlers";
type ExecutorType = "fetch" | "axios" | "ky" | "dispatch" | "custom";
type PluginKey = "logger" | "auth" | "custom";

interface DemoState {
  routers: Set<RouterKey>;
  factory: Factory;
  executor: ExecutorType;
  plugins: Set<PluginKey>;
  queries: boolean;
}

// Phase drives CSS animation via data-phase attribute
type Phase = "entering" | "stable" | "exiting" | "dimming" | "brightening";

interface SectionView {
  id: string;
  html: string;
  phase: Phase;
  nextHtml?: string;
}

interface ShikiHighlighter {
  codeToHtml(code: string, options: { lang: string; theme: string }): string;
}

// ── UI config ──────────────────────────────────────────────────────────────

const ROUTERS: { key: RouterKey; label: string }[] = [
  { key: "todo", label: "todoRouter" },
  { key: "post", label: "postRouter" },
  { key: "user", label: "userRouter" },
];

const FACTORIES: { key: Factory; label: string }[] = [
  { key: "createApi", label: "createApi" },
  { key: "createMswHandlers", label: "createMswHandlers" },
];

const EXECUTORS: { key: ExecutorType; label: string }[] = [
  { key: "fetch", label: "fetch" },
  { key: "axios", label: "axios" },
  { key: "ky", label: "ky" },
  { key: "dispatch", label: "dispatchExecutor" },
  { key: "custom", label: "custom" },
];

const PLUGINS: { key: PluginKey; label: string }[] = [
  { key: "logger", label: "logger" },
  { key: "auth", label: "auth" },
  { key: "custom", label: "custom" },
];

// Selected plugins → the reference used inside `plugins: [...]`
const PLUGIN_REF: Record<PluginKey, string> = {
  logger: "logger()",
  auth: "authPlugin",
  custom: "customPlugin",
};

// ── Architecture layers (mirrors /guides/architecture) ───────────────────────
// Each control below builds one of these five layers; the rail lights up the
// layers the current configuration actually uses.

type LayerNum = 1 | 2 | 3 | 4 | 5;

const LAYERS: { n: LayerNum; anchor: string }[] = [
  { n: 1, anchor: "layer-1--spec-declaration" },
  { n: 2, anchor: "layer-2--typed-client-factory" },
  { n: 3, anchor: "layer-3--middleware-chain" },
  { n: 4, anchor: "layer-4--transport" },
  { n: 5, anchor: "layer-5--tanstack-query-bindings-optional" },
];

// ── Copy (localized UI chrome; generated code stays English) ──────────────────

type Locale = "en" | "ko";

interface Copy {
  eyebrow: string;
  title: string;
  subtitle: [string, string];
  groups: {
    routers: string;
    factory: string;
    plugins: string;
    executor: string;
    queries: string;
  };
  layers: Record<LayerNum, string>;
  archLink: string;
}

const COPY: Record<Locale, Copy> = {
  en: {
    eyebrow: "Composable by design",
    title: "Mix and match anything",
    subtitle: [
      "Swap executors, stack plugins, combine routers, bind TanStack Query.",
      "Every control is one architecture layer — the types assemble themselves.",
    ],
    groups: {
      routers: "Routers",
      factory: "Create with",
      plugins: "Plugins",
      executor: "Executor",
      queries: "Query bindings",
    },
    layers: {
      1: "Spec",
      2: "Client",
      3: "Middleware",
      4: "Transport",
      5: "Query",
    },
    archLink: "See how these five layers fit together — Architecture guide →",
  },
  ko: {
    eyebrow: "조합을 위한 설계",
    title: "무엇이든 조합하세요",
    subtitle: [
      "executor를 교체하고, 플러그인을 쌓고, 라우터를 합치고, TanStack Query를 연결하세요.",
      "모든 컨트롤이 하나의 아키텍처 레이어로. 타입은 스스로 조합됩니다.",
    ],
    groups: {
      routers: "라우터",
      factory: "생성 방식",
      plugins: "플러그인",
      executor: "Executor",
      queries: "쿼리 바인딩",
    },
    layers: {
      1: "스펙",
      2: "클라이언트",
      3: "미들웨어",
      4: "트랜스포트",
      5: "쿼리",
    },
    archLink: "다섯 레이어가 어떻게 맞물리는지 보기 — 아키텍처 가이드 →",
  },
};

// ── Per-section code generators ────────────────────────────────────────────

function codeImports({
  factory,
  executor,
  plugins,
  queries,
}: DemoState): string {
  const isMsw = factory === "createMswHandlers";
  const isDispatch = executor === "dispatch";
  const isCustomExec = executor === "custom";
  const pluginsActive = !isMsw && !isDispatch;
  const hasLogger = pluginsActive && plugins.has("logger");
  const hasDefined =
    pluginsActive && (plugins.has("auth") || plugins.has("custom"));
  const hasQueries = !isMsw && queries;

  const core: string[] = ["endpoint", "defineRouter"];
  if (!isMsw) core.push("createApi");
  if (!isMsw && (executor === "fetch" || isDispatch))
    core.push("createFetchExecutor");
  if (isDispatch) core.push("dispatchExecutor");
  if (isCustomExec) core.push("createExecutor");
  if (hasDefined) core.push("definePlugin");
  if (hasLogger) core.push("logger");

  const lines = [
    `import { z } from 'zod'`,
    `import { ${core.join(", ")} } from '@routar/core'`,
  ];
  if (!isMsw) {
    if (executor === "axios" || isDispatch)
      lines.push(`import { createAxiosExecutor } from '@routar/axios'`);
    if (executor === "ky")
      lines.push(`import { createKyExecutor } from '@routar/ky'`);
  } else {
    lines.push(`import { createMswHandlers } from '@routar/msw'`);
  }
  if (hasQueries)
    lines.push(`import { createQueries } from '@routar/react-query'`);
  return lines.join("\n");
}

function codeTodo(): string {
  return [
    `const TodoSchema = z.object({ id: z.number(), title: z.string(), done: z.boolean() })`,
    ``,
    `const todoRouter = defineRouter('/todos', {`,
    `  list:   endpoint({ method: 'GET',  path: '/',    response: z.array(TodoSchema) }),`,
    `  detail: endpoint({ method: 'GET',  path: '/:id', response: TodoSchema,`,
    `                     request: { path: z.object({ id: z.number() }) } }),`,
    `  create: endpoint({ method: 'POST', path: '/',    response: TodoSchema,`,
    `                     request: { body: z.object({ title: z.string() }) } }),`,
    `})`,
  ].join("\n");
}

function codePost(): string {
  return [
    `const PostSchema = z.object({ id: z.number(), title: z.string(), body: z.string() })`,
    ``,
    `const postRouter = defineRouter('/posts', {`,
    `  list:   endpoint({ method: 'GET', path: '/',    response: z.array(PostSchema) }),`,
    `  detail: endpoint({ method: 'GET', path: '/:id', response: PostSchema,`,
    `                     request: { path: z.object({ id: z.number() }) } }),`,
    `})`,
  ].join("\n");
}

function codeUser(): string {
  return [
    `const UserSchema = z.object({ id: z.number(), name: z.string(), email: z.string() })`,
    ``,
    `const userRouter = defineRouter('/users', {`,
    `  list:    endpoint({ method: 'GET', path: '/',    response: z.array(UserSchema) }),`,
    `  profile: endpoint({ method: 'GET', path: '/:id', response: UserSchema,`,
    `                      request: { path: z.object({ id: z.number() }) } }),`,
    `})`,
  ].join("\n");
}

function codePluginDefs({ plugins }: DemoState): string {
  const blocks: string[] = [];
  if (plugins.has("auth")) {
    blocks.push(
      [
        `const authPlugin = definePlugin({`,
        `  name: 'auth',`,
        `  onRequest: async (opts) => ({`,
        `    ...opts,`,
        "    headers: { ...opts.headers, Authorization: `Bearer ${await getToken()}` },",
        `  }),`,
        `})`,
      ].join("\n"),
    );
  }
  if (plugins.has("custom")) {
    blocks.push(
      [
        `const customPlugin = definePlugin({`,
        `  name: 'custom',`,
        `  onResponse: (res) => res, // transform responses here`,
        `})`,
      ].join("\n"),
    );
  }
  return blocks.join("\n\n");
}

function codeExecutor({ executor, plugins }: DemoState): string {
  const refs = PLUGINS.filter(({ key }) => plugins.has(key)).map(
    ({ key }) => PLUGIN_REF[key],
  );
  const optsInline =
    refs.length > 0 ? `, { plugins: [${refs.join(", ")}] }` : "";

  if (executor === "fetch")
    return `const executor = createFetchExecutor('https://api.example.com'${optsInline})`;
  if (executor === "axios") {
    const base = `axios.create({ baseURL: 'https://api.example.com' })`;
    return `const executor = createAxiosExecutor(${base}${optsInline})`;
  }
  if (executor === "ky")
    return `const executor = createKyExecutor('https://api.example.com'${optsInline})`;
  if (executor === "dispatch")
    return [
      `const serverExecutor = createFetchExecutor('https://api.example.com')`,
      `const clientExecutor = createAxiosExecutor(axios.create({ baseURL: 'https://api.example.com' }))`,
      ``,
      `const executor = dispatchExecutor((opts) =>`,
      `  typeof window === 'undefined' ? serverExecutor : clientExecutor`,
      `)`,
    ].join("\n");

  // custom
  const lines = [
    `const executor = createExecutor(`,
    `  async ({ method, url, body }) => {`,
    `    const res = await fetch(url, { method, body: JSON.stringify(body) })`,
    `    return res.json()`,
    `  },`,
  ];
  if (refs.length > 0) lines.push(`  { plugins: [${refs.join(", ")}] },`);
  lines.push(`)`);
  return lines.join("\n");
}

function codeFactory({ routers, factory }: DemoState): string {
  const isMsw = factory === "createMswHandlers";
  const keys = [...routers];
  const isMulti = keys.length > 1;

  const routerArg =
    keys.length === 1
      ? keys[0] === "todo"
        ? "todoRouter"
        : keys[0] === "post"
          ? "postRouter"
          : "userRouter"
      : `defineRouter('/api', {\n${keys.map((r) => `  ${r === "todo" ? "todos: todoRouter," : r === "post" ? "posts: postRouter," : "users: userRouter,"}`).join("\n")}\n})`;

  if (isMsw) {
    return [
      `const handlers = createMswHandlers(${routerArg})`,
      ``,
      `// MSW v2 — use in tests or browser`,
      `import { setupWorker } from 'msw/browser'`,
      `const worker = setupWorker(...handlers)`,
      `await worker.start()`,
    ].join("\n");
  }

  const lines = [
    `const api = createApi(executor, ${routerArg})`,
    ``,
    `// Type-safe API calls`,
  ];

  const first = keys[0];
  const ns = isMulti
    ? first === "todo"
      ? ".todos"
      : first === "post"
        ? ".posts"
        : ".users"
    : "";

  if (first === "todo") {
    lines.push(
      `const todos = await api${ns}.list({})                         // Todo[]`,
    );
    lines.push(
      `const todo  = await api${ns}.detail({ path: { id: 1 } })     // Todo`,
    );
    if (!isMulti)
      lines.push(
        `const next  = await api.create({ body: { title: 'buy milk' } }) // Todo`,
      );
  } else if (first === "post") {
    lines.push(
      `const posts = await api${ns}.list({})                         // Post[]`,
    );
    lines.push(
      `const post  = await api${ns}.detail({ path: { id: 1 } })     // Post`,
    );
  } else {
    lines.push(
      `const users = await api${ns}.list({})                         // User[]`,
    );
    lines.push(
      `const user  = await api${ns}.profile({ path: { id: 1 } })    // User`,
    );
  }

  if (isMulti) {
    const second = keys[1];
    const ns2 =
      second === "todo" ? ".todos" : second === "post" ? ".posts" : ".users";
    lines.push(
      second === "todo"
        ? `const todos = await api${ns2}.list({})                      // Todo[]`
        : second === "post"
          ? `const posts = await api${ns2}.list({})                      // Post[]`
          : `const users = await api${ns2}.list({})                      // User[]`,
    );
  }

  return lines.join("\n");
}

function codeQueries({ routers }: DemoState): string {
  const keys = [...routers];
  const isMulti = keys.length > 1;
  const first = keys[0];
  const ns = isMulti
    ? first === "todo"
      ? ".todos"
      : first === "post"
        ? ".posts"
        : ".users"
    : "";
  const queryName = isMulti
    ? "apiQuery"
    : first === "todo"
      ? "todoQuery"
      : first === "post"
        ? "postQuery"
        : "userQuery";
  const showMutation = first === "todo" && !isMulti;

  const lines = [
    showMutation
      ? `import { useSuspenseQuery, useMutation } from '@tanstack/react-query'`
      : `import { useSuspenseQuery } from '@tanstack/react-query'`,
    ``,
    `// Query keys + queryFn derived straight from \`api\` — one source of truth`,
    `export const ${queryName} = createQueries(api)`,
    ``,
    `// In a client component — \`data\` is fully typed and never null`,
  ];

  if (first === "todo") {
    lines.push(
      `const { data: todos } = useSuspenseQuery(${queryName}${ns}.list({}))`,
    );
    lines.push(
      `const { data: todo }  = useSuspenseQuery(${queryName}${ns}.detail({ path: { id: 1 } }))`,
    );
    if (showMutation)
      lines.push(
        `const { mutate: create } = useMutation(${queryName}.create()) // POST → mutationOptions`,
      );
  } else if (first === "post") {
    lines.push(
      `const { data: posts } = useSuspenseQuery(${queryName}${ns}.list({}))`,
    );
    lines.push(
      `const { data: post }  = useSuspenseQuery(${queryName}${ns}.detail({ path: { id: 1 } }))`,
    );
  } else {
    lines.push(
      `const { data: users } = useSuspenseQuery(${queryName}${ns}.list({}))`,
    );
    lines.push(
      `const { data: user }  = useSuspenseQuery(${queryName}${ns}.profile({ path: { id: 1 } }))`,
    );
  }

  return lines.join("\n");
}

// ── Section ordering ───────────────────────────────────────────────────────

type SectionId =
  | "imports"
  | "todo"
  | "post"
  | "user"
  | "plugin-defs"
  | "executor"
  | "factory"
  | "queries";

const GENERATORS: Record<SectionId, (s: DemoState) => string> = {
  imports: codeImports,
  todo: codeTodo,
  post: codePost,
  user: codeUser,
  "plugin-defs": codePluginDefs,
  executor: codeExecutor,
  factory: codeFactory,
  queries: codeQueries,
};

function getActiveSections(state: DemoState): SectionId[] {
  const { routers, factory, executor, plugins, queries } = state;
  const isMsw = factory === "createMswHandlers";
  const isDispatch = executor === "dispatch";
  const hasDefinedPlugin =
    !isMsw && !isDispatch && (plugins.has("auth") || plugins.has("custom"));
  return [
    "imports",
    ...(routers.has("todo") ? (["todo"] as SectionId[]) : []),
    ...(routers.has("post") ? (["post"] as SectionId[]) : []),
    ...(routers.has("user") ? (["user"] as SectionId[]) : []),
    ...(hasDefinedPlugin ? (["plugin-defs"] as SectionId[]) : []),
    ...(!isMsw ? (["executor"] as SectionId[]) : []),
    "factory",
    ...(!isMsw && queries ? (["queries"] as SectionId[]) : []),
  ];
}

// ── Shiki singleton ────────────────────────────────────────────────────────

let highlighterPromise: Promise<ShikiHighlighter> | null = null;

function getHighlighter(): Promise<ShikiHighlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then(({ getSingletonHighlighter }) =>
      getSingletonHighlighter({
        themes: ["github-dark"],
        langs: ["typescript"],
      }),
    ) as Promise<ShikiHighlighter>;
  }
  return highlighterPromise;
}

// ── Component ──────────────────────────────────────────────────────────────

export function ComposableDemo({ lang = "en" }: { lang?: string }) {
  const copy = COPY[lang === "ko" ? "ko" : "en"];
  const [routers, setRouters] = useState<Set<RouterKey>>(new Set(["todo"]));
  const [factory, setFactory] = useState<Factory>("createApi");
  const [executor, setExecutor] = useState<ExecutorType>("fetch");
  const [plugins, setPlugins] = useState<Set<PluginKey>>(new Set());
  const [queries, setQueries] = useState(false);
  const [sections, setSections] = useState<SectionView[]>([]);

  const isMounted = useRef(false);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isMsw = factory === "createMswHandlers";
  const isDispatch = executor === "dispatch";
  const executorDisabled = isMsw;
  const pluginsDisabled = isMsw || isDispatch;
  const queriesDisabled = isMsw;

  // Which architecture layers the current configuration assembles
  const layerActive: Record<LayerNum, boolean> = {
    1: true,
    2: true,
    3: !pluginsDisabled && plugins.size > 0,
    4: !isMsw,
    5: !isMsw && queries,
  };

  function schedule(key: string, fn: () => void, delay: number) {
    const existing = timers.current.get(key);
    if (existing) clearTimeout(existing);
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key);
        fn();
      }, delay),
    );
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: schedule is not a dependency
  useEffect(() => {
    const state: DemoState = { routers, factory, executor, plugins, queries };
    const activeIds = getActiveSections(state);
    const isFirst = !isMounted.current;

    getHighlighter().then((h) => {
      setSections((prev) => {
        const prevMap = new Map(prev.map((s) => [s.id, s]));
        const activeSet = new Set<string>(activeIds);
        const next: SectionView[] = [];

        for (const id of activeIds) {
          const html = h.codeToHtml(GENERATORS[id](state), {
            lang: "typescript",
            theme: "github-dark",
          });
          const prevSection = prevMap.get(id);

          if (!prevSection) {
            next.push({ id, html, phase: isFirst ? "stable" : "entering" });
            if (!isFirst) {
              schedule(
                id,
                () => {
                  setSections((v) =>
                    v.map((s) =>
                      s.id === id && s.phase === "entering"
                        ? { ...s, phase: "stable" }
                        : s,
                    ),
                  );
                },
                380,
              );
            }
          } else if (prevSection.html !== html) {
            next.push({
              id,
              html: prevSection.html,
              phase: "dimming",
              nextHtml: html,
            });
            schedule(
              id + ":swap",
              () => {
                setSections((v) =>
                  v.map((s) =>
                    s.id === id && s.phase === "dimming"
                      ? {
                          ...s,
                          html: s.nextHtml!,
                          phase: "brightening",
                          nextHtml: undefined,
                        }
                      : s,
                  ),
                );
              },
              160,
            );
            schedule(
              id + ":done",
              () => {
                setSections((v) =>
                  v.map((s) =>
                    s.id === id && s.phase === "brightening"
                      ? { ...s, phase: "stable" }
                      : s,
                  ),
                );
              },
              380,
            );
          } else {
            next.push({ ...prevSection, phase: "stable" });
          }
        }

        for (const s of prev) {
          if (!activeSet.has(s.id) && s.phase !== "exiting") {
            next.push({ ...s, phase: "exiting" });
            schedule(
              s.id + ":rm",
              () => {
                setSections((v) => v.filter((sv) => sv.id !== s.id));
              },
              280,
            );
          }
        }

        // Keep exiting sections roughly in their original position
        const orderMap = new Map<string, number>(
          activeIds.map((id, i) => [id, i]),
        );
        next.sort((a, b) => {
          const ai = orderMap.get(a.id) ?? prev.findIndex((s) => s.id === a.id);
          const bi = orderMap.get(b.id) ?? prev.findIndex((s) => s.id === b.id);
          return (ai ?? 999) - (bi ?? 999);
        });

        isMounted.current = true;
        return next;
      });
    });
  }, [routers, factory, executor, plugins, queries]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleRouter(key: RouterKey) {
    setRouters((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function togglePlugin(key: PluginKey) {
    if (pluginsDisabled) return;
    setPlugins((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const groupBase =
    "flex flex-wrap items-center gap-3.5 transition-opacity max-[540px]:flex-col max-[540px]:items-start max-[540px]:gap-2";
  const groupCls = (disabled: boolean) =>
    `${groupBase}${disabled ? " pointer-events-none opacity-30" : ""}`;
  const groupLabel =
    "inline-flex shrink-0 items-center text-[0.68rem] font-bold uppercase tracking-[0.07em] text-gray-400 min-w-[122px] max-[540px]:min-w-0";
  const layerTag =
    "mr-2 rounded-[5px] bg-brand/10 px-[5px] py-px font-mono text-[0.58rem] font-extrabold tracking-[0.02em] text-brand";
  const chipBase =
    "whitespace-nowrap cursor-pointer rounded-full border border-black/10 bg-transparent px-3 py-1 font-mono text-[0.78rem] font-medium text-inherit transition-all enabled:hover:border-brand/45 enabled:hover:text-brand enabled:active:scale-[0.93]";
  const chipCls = (active: boolean) =>
    `${chipBase}${active ? " !border-brand bg-brand/10 !text-brand animate-chip-pop motion-reduce:animate-none" : ""}`;

  return (
    <LandingSection
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={`${copy.subtitle[0]}\n${copy.subtitle[1]}`}
      footer={
        <a
          className="text-[0.82rem] font-semibold text-brand no-underline transition-all hover:opacity-80"
          href={`/${lang}/guides/architecture`}
        >
          {copy.archLink}
        </a>
      }
    >
      {/* ── Architecture-layer rail (mirrors /guides/architecture) ── */}
      <div className="mb-[18px] flex flex-wrap items-center justify-center gap-1 max-[540px]:gap-0.5">
        {LAYERS.map((l, i) => (
          <Fragment key={l.n}>
            {i > 0 && (
              <span
                className="select-none text-[0.78rem] text-gray-300 max-[540px]:text-[0.7rem]"
                aria-hidden="true"
              >
                →
              </span>
            )}
            <a
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-black/8 bg-transparent px-[11px] py-1.5 text-gray-400 no-underline transition-all hover:-translate-y-px hover:border-brand/45 data-[active=true]:animate-rail-pulse data-[active=true]:border-brand/40 data-[active=true]:bg-brand/8 data-[active=true]:text-brand data-[active=true]:shadow-[0_2px_16px_rgba(99,102,241,0.18)] motion-reduce:animate-none"
              data-active={layerActive[l.n] ? "true" : "false"}
              href={`/${lang}/guides/architecture#${l.anchor}`}
              title={`Layer ${l.n} — open the Architecture guide`}
            >
              <span className="font-mono text-[0.6rem] font-extrabold tracking-[0.03em] opacity-85">
                L{l.n}
              </span>
              <span className="text-[0.74rem] font-semibold max-[540px]:hidden">
                {copy.layers[l.n]}
              </span>
            </a>
          </Fragment>
        ))}
      </div>

      <div className="flex flex-col">
        <div className="mb-5 flex flex-col gap-3 rounded-[14px] border border-black/8 bg-brand/2 px-6 py-5 max-[540px]:p-4 dark:border-white/10">
          <div className={groupCls(false)}>
            <span className={groupLabel}>
              <span className={layerTag}>L1</span>
              {copy.groups.routers}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ROUTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleRouter(key)}
                  className={chipCls(routers.has(key))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={groupCls(false)}>
            <span className={groupLabel}>
              <span className={layerTag}>L2</span>
              {copy.groups.factory}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FACTORIES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFactory(key)}
                  className={chipCls(factory === key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={groupCls(pluginsDisabled)}>
            <span className={groupLabel}>
              <span className={layerTag}>L3</span>
              {copy.groups.plugins}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PLUGINS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePlugin(key)}
                  className={chipCls(plugins.has(key) && !pluginsDisabled)}
                  disabled={pluginsDisabled}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={groupCls(executorDisabled)}>
            <span className={groupLabel}>
              <span className={layerTag}>L4</span>
              {copy.groups.executor}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EXECUTORS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => !executorDisabled && setExecutor(key)}
                  className={chipCls(executor === key && !executorDisabled)}
                  disabled={executorDisabled}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={groupCls(queriesDisabled)}>
            <span className={groupLabel}>
              <span className={layerTag}>L5</span>
              {copy.groups.queries}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => !queriesDisabled && setQueries((v) => !v)}
                className={chipCls(queries && !queriesDisabled)}
                disabled={queriesDisabled}
              >
                createQueries
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[540px] overflow-hidden overflow-y-auto rounded-[14px] bg-[#24292e] shadow-[0_8px_40px_rgba(0,0,0,0.18)] [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-white/12 [&::-webkit-scrollbar]:w-[5px]">
          {sections.map((s) => (
            <div
              key={s.id}
              className="px-8 text-[0.82rem] leading-[1.7] first:pt-7 last:pb-7 max-[540px]:px-5 max-[540px]:first:pt-5 max-[540px]:last:pb-5 data-[phase=brightening]:animate-section-brighten data-[phase=entering]:animate-section-enter data-[phase=exiting]:pointer-events-none data-[phase=exiting]:animate-section-exit data-[phase=dimming]:opacity-0 data-[phase=dimming]:transition-opacity data-[phase=dimming]:duration-[140ms] motion-reduce:animate-none [&+&]:pt-[1.7em] [&_.shiki]:!m-0 [&_.shiki]:!overflow-visible [&_.shiki]:!bg-transparent [&_.shiki]:!p-0 [&_.shiki]:!text-[0.82rem] [&_.shiki]:!leading-[1.7]"
              data-phase={s.phase}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: code to html
              dangerouslySetInnerHTML={{ __html: s.html }}
            />
          ))}
        </div>
      </div>
    </LandingSection>
  );
}
