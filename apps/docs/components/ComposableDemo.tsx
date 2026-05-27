"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ComposableDemo.module.css";

// ── Types ──────────────────────────────────────────────────────────────────

type RouterKey = "todo" | "post" | "user";
type Factory = "createApi" | "createMswHandlers";
type ExecutorType = "fetch" | "axios" | "ky" | "dispatch" | "custom";
type MiddlewareKey = "withRetry" | "withTimeout" | "withLogger" | "custom";

interface DemoState {
  routers: Set<RouterKey>;
  factory: Factory;
  executor: ExecutorType;
  middlewares: Set<MiddlewareKey>;
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

const MIDDLEWARES: { key: MiddlewareKey; label: string }[] = [
  { key: "withRetry", label: "withRetry" },
  { key: "withTimeout", label: "withTimeout" },
  { key: "withLogger", label: "withLogger" },
  { key: "custom", label: "custom" },
];

// ── Per-section code generators ────────────────────────────────────────────

function codeImports({ factory, executor, middlewares }: DemoState): string {
  const isMsw = factory === "createMswHandlers";
  const isDispatch = executor === "dispatch";
  const isCustomExec = executor === "custom";
  const stdMw = [...middlewares].filter((m) => m !== "custom");
  const hasCustomMw = middlewares.has("custom");

  const core: string[] = ["endpoint", "defineRouter"];
  if (!isMsw) core.push("createApi");
  if (isDispatch) core.push("dispatchExecutor");
  if (isCustomExec) core.push("createExecutor");
  if (!isMsw && !isDispatch && hasCustomMw) core.push("type ExecutorMiddleware");
  for (const mw of stdMw) core.push(mw);

  const lines = [
    `import { z } from 'zod'`,
    `import { ${core.join(", ")} } from '@routar/core'`,
  ];
  if (!isMsw) {
    if (executor === "fetch" || isDispatch)
      lines.push(`import { createFetchExecutor } from '@routar/fetch'`);
    if (executor === "axios" || isDispatch)
      lines.push(`import { createAxiosExecutor } from '@routar/axios'`);
    if (executor === "ky")
      lines.push(`import { createKyExecutor } from '@routar/ky'`);
  } else {
    lines.push(`import { createMswHandlers } from '@routar/msw'`);
  }
  return lines.join("\n");
}

function codeTodo(): string {
  return [
    `const TodoSchema = z.object({ id: z.number(), title: z.string(), done: z.boolean() })`,
    ``,
    `const todoRouter = defineRouter('/todos', {`,
    `  list:   endpoint({ method: 'GET',  path: '/',    response: z.array(TodoSchema) }),`,
    `  detail: endpoint({ method: 'GET',  path: '/:id', response: TodoSchema,`,
    `                     request: z.object({ path: z.object({ id: z.number() }) }) }),`,
    `  create: endpoint({ method: 'POST', path: '/',    response: TodoSchema,`,
    `                     request: z.object({ body: z.object({ title: z.string() }) }) }),`,
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
    `                     request: z.object({ path: z.object({ id: z.number() }) }) }),`,
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
    `                      request: z.object({ path: z.object({ id: z.number() }) }) }),`,
    `})`,
  ].join("\n");
}

function codeCustomMw(): string {
  return [
    `const customMiddleware: ExecutorMiddleware = async (opts, next) => {`,
    `  // add your logic here`,
    `  return next(opts)`,
    `}`,
  ].join("\n");
}

function codeExecutor({ executor, middlewares }: DemoState): string {
  const stdMw = [...middlewares].filter((m) => m !== "custom");
  const hasCustomMw = middlewares.has("custom");
  const mwItems: string[] = [];
  if (stdMw.includes("withRetry")) mwItems.push("withRetry(3)");
  if (stdMw.includes("withTimeout")) mwItems.push("withTimeout(5000)");
  if (stdMw.includes("withLogger")) mwItems.push("withLogger()");
  if (hasCustomMw) mwItems.push("customMiddleware");
  const mwInline = mwItems.length > 0 ? `, [${mwItems.join(", ")}]` : "";

  if (executor === "fetch")
    return `const executor = createFetchExecutor('https://api.example.com'${mwInline})`;
  if (executor === "axios") {
    const base = `axios.create({ baseURL: 'https://api.example.com' })`;
    return mwItems.length > 0
      ? `const executor = createAxiosExecutor(${base}, [${mwItems.join(", ")}])`
      : `const executor = createAxiosExecutor(${base})`;
  }
  if (executor === "ky")
    return `const executor = createKyExecutor('https://api.example.com'${mwInline})`;
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
  if (mwItems.length > 0) lines.push(`  [${mwItems.join(", ")}]`);
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
    ? first === "todo" ? ".todos" : first === "post" ? ".posts" : ".users"
    : "";

  if (first === "todo") {
    lines.push(`const todos = await api${ns}.list({})                         // Todo[]`);
    lines.push(`const todo  = await api${ns}.detail({ path: { id: 1 } })     // Todo`);
    if (!isMulti)
      lines.push(`const next  = await api.create({ body: { title: 'buy milk' } }) // Todo`);
  } else if (first === "post") {
    lines.push(`const posts = await api${ns}.list({})                         // Post[]`);
    lines.push(`const post  = await api${ns}.detail({ path: { id: 1 } })     // Post`);
  } else {
    lines.push(`const users = await api${ns}.list({})                         // User[]`);
    lines.push(`const user  = await api${ns}.profile({ path: { id: 1 } })    // User`);
  }

  if (isMulti) {
    const second = keys[1];
    const ns2 = second === "todo" ? ".todos" : second === "post" ? ".posts" : ".users";
    lines.push(
      second === "todo"
        ? `const todos = await api${ns2}.list({})                      // Todo[]`
        : second === "post"
          ? `const posts = await api${ns2}.list({})                      // Post[]`
          : `const users = await api${ns2}.list({})                      // User[]`
    );
  }

  return lines.join("\n");
}

// ── Section ordering ───────────────────────────────────────────────────────

type SectionId = "imports" | "todo" | "post" | "user" | "custom-mw" | "executor" | "factory";

const GENERATORS: Record<SectionId, (s: DemoState) => string> = {
  imports: codeImports,
  todo: codeTodo,
  post: codePost,
  user: codeUser,
  "custom-mw": codeCustomMw,
  executor: codeExecutor,
  factory: codeFactory,
};

function getActiveSections(state: DemoState): SectionId[] {
  const { routers, factory, executor, middlewares } = state;
  const isMsw = factory === "createMswHandlers";
  const isDispatch = executor === "dispatch";
  return [
    "imports",
    ...(routers.has("todo") ? (["todo"] as SectionId[]) : []),
    ...(routers.has("post") ? (["post"] as SectionId[]) : []),
    ...(routers.has("user") ? (["user"] as SectionId[]) : []),
    ...(!isMsw && !isDispatch && middlewares.has("custom") ? (["custom-mw"] as SectionId[]) : []),
    ...(!isMsw ? (["executor"] as SectionId[]) : []),
    "factory",
  ];
}

// ── Shiki singleton ────────────────────────────────────────────────────────

let highlighterPromise: Promise<ShikiHighlighter> | null = null;

function getHighlighter(): Promise<ShikiHighlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then(({ getSingletonHighlighter }) =>
      getSingletonHighlighter({ themes: ["github-dark"], langs: ["typescript"] })
    ) as Promise<ShikiHighlighter>;
  }
  return highlighterPromise;
}


// ── Component ──────────────────────────────────────────────────────────────

export function ComposableDemo() {
  const [routers, setRouters] = useState<Set<RouterKey>>(new Set(["todo"]));
  const [factory, setFactory] = useState<Factory>("createApi");
  const [executor, setExecutor] = useState<ExecutorType>("fetch");
  const [middlewares, setMiddlewares] = useState<Set<MiddlewareKey>>(new Set());
  const [sections, setSections] = useState<SectionView[]>([]);

  const isMounted = useRef(false);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isMsw = factory === "createMswHandlers";
  const isDispatch = executor === "dispatch";
  const executorDisabled = isMsw;
  const middlewareDisabled = isMsw || isDispatch;

  function schedule(key: string, fn: () => void, delay: number) {
    const existing = timers.current.get(key);
    if (existing) clearTimeout(existing);
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key);
        fn();
      }, delay)
    );
  }

  useEffect(() => {
    const state: DemoState = { routers, factory, executor, middlewares };
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
              schedule(id, () => {
                setSections((v) =>
                  v.map((s) => (s.id === id && s.phase === "entering" ? { ...s, phase: "stable" } : s))
                );
              }, 380);
            }
          } else if (prevSection.html !== html) {
            next.push({ id, html: prevSection.html, phase: "dimming", nextHtml: html });
            schedule(id + ":swap", () => {
              setSections((v) =>
                v.map((s) =>
                  s.id === id && s.phase === "dimming"
                    ? { ...s, html: s.nextHtml!, phase: "brightening", nextHtml: undefined }
                    : s
                )
              );
            }, 160);
            schedule(id + ":done", () => {
              setSections((v) =>
                v.map((s) => (s.id === id && s.phase === "brightening" ? { ...s, phase: "stable" } : s))
              );
            }, 380);
          } else {
            next.push({ ...prevSection, phase: "stable" });
          }
        }

        for (const s of prev) {
          if (!activeSet.has(s.id) && s.phase !== "exiting") {
            next.push({ ...s, phase: "exiting" });
            schedule(s.id + ":rm", () => {
              setSections((v) => v.filter((sv) => sv.id !== s.id));
            }, 280);
          }
        }

        // Keep exiting sections roughly in their original position
        const orderMap = new Map<string, number>(activeIds.map((id, i) => [id, i]));
        next.sort((a, b) => {
          const ai = orderMap.get(a.id) ?? prev.findIndex((s) => s.id === a.id);
          const bi = orderMap.get(b.id) ?? prev.findIndex((s) => s.id === b.id);
          return (ai ?? 999) - (bi ?? 999);
        });

        isMounted.current = true;
        return next;
      });
    });
  }, [routers, factory, executor, middlewares]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleRouter(key: RouterKey) {
    setRouters((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleMiddleware(key: MiddlewareKey) {
    if (middlewareDisabled) return;
    setMiddlewares((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Composable by design</p>
        <h2 className={styles.title}>Mix and match anything</h2>
        <p className={styles.subtitle}>
          Swap executors, stack middleware, combine routers.
          <br />
          The types assemble themselves.
        </p>
      </div>

      <div className={styles.selectors}>
        <div className={styles.group}>
          <span className={styles.groupLabel}>Routers</span>
          <div className={styles.chips}>
            {ROUTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleRouter(key)}
                className={`${styles.chip} ${routers.has(key) ? styles.chipActive : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Create with</span>
          <div className={styles.chips}>
            {FACTORIES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFactory(key)}
                className={`${styles.chip} ${factory === key ? styles.chipActive : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={`${styles.group} ${executorDisabled ? styles.groupDisabled : ""}`}>
          <span className={styles.groupLabel}>Executor</span>
          <div className={styles.chips}>
            {EXECUTORS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => !executorDisabled && setExecutor(key)}
                className={`${styles.chip} ${executor === key && !executorDisabled ? styles.chipActive : ""}`}
                disabled={executorDisabled}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={`${styles.group} ${middlewareDisabled ? styles.groupDisabled : ""}`}>
          <span className={styles.groupLabel}>Middleware</span>
          <div className={styles.chips}>
            {MIDDLEWARES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleMiddleware(key)}
                className={`${styles.chip} ${middlewares.has(key) && !middlewareDisabled ? styles.chipActive : ""}`}
                disabled={middlewareDisabled}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.codeContainer}>
        {sections.map((s) => (
          <div
            key={s.id}
            className={styles.section}
            data-phase={s.phase}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: s.html }}
          />
        ))}
      </div>
    </div>
  );
}
