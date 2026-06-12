"use client";

import { useEffect, useState } from "react";
import styles from "./BeforeAfterDemo.module.css";

interface ShikiHighlighter {
  codeToHtml(code: string, options: { lang: string; theme: string }): string;
}

type Locale = "en" | "ko";

// ── Localization ───────────────────────────────────────────────────────────

interface Copy {
  eyebrow: string;
  title: string;
  subtitle: string;
  beforeLabel: string;
  afterLabel: string;
  beforeCount: string;
  afterCount: string;
  reduction: string;
  fileNotes: string[];
  afterNote: string;
}

const COPY: Record<Locale, Copy> = {
  en: {
    eyebrow: "The contrast",
    title: "AI generates fast.\nBut the growing context is still yours to manage.",
    subtitle:
      "AI can write all 6 files. But when the API changes, it has to find and update every one — or ship drift.",
    beforeLabel: "Without routar",
    afterLabel: "With routar",
    beforeCount: "6 files · ~120 lines",
    afterCount: "1 file · ~30 lines",
    reduction: "6× fewer files · ~4× fewer lines · one place to change",
    fileNotes: [
      "Manually typed — server drift is invisible until runtime",
      "Every fetch is a cast. Wrong shape from the server? Passes silently.",
      "5 hand-rolled functions, 0 runtime validation — apiFetch<Todo> is a cast, not a check",
      "Must mirror api/todos.ts exactly — add an endpoint? Update both. Miss one? Wrong cache key.",
      "Imports 4 separate files. Add a field → update types → api → queryKeys → here",
      "No shared contract — re-implements api/todos.ts manually, drifts silently",
    ],
    afterNote:
      "types · client · query keys · mutations · MSW handlers — all derived. No sync needed.",
  },
  ko: {
    eyebrow: "코드 비교",
    title: "AI가 빠르게 생성합니다.\n그러나 불어난 컨텍스트는 여전히 당신의 몫입니다.",
    subtitle:
      "AI가 왼쪽 6개 파일을 전부 생성할 수 있습니다. 하지만 API가 바뀌면 — 6곳을 찾아 수정하거나, drift를 배포하거나.",
    beforeLabel: "routar 없이",
    afterLabel: "routar 사용 시",
    beforeCount: "6개 파일 · ~120줄",
    afterCount: "1개 파일 · ~30줄",
    reduction: "파일 6배 감소 · 코드 4배 감소 · 변경은 한 곳에서",
    fileNotes: [
      "수동으로 타이핑 — 서버 drift는 런타임 전까지 안 보임",
      "모든 fetch가 캐스트. 서버에서 잘못된 shape 와도? 조용히 통과.",
      "5개 수작업 함수, 런타임 검증 0 — apiFetch<Todo>는 캐스트, 검증이 아님",
      "api/todos.ts를 정확히 미러링해야 함 — 엔드포인트 추가 시 둘 다 수정, 하나 놓치면 잘못된 캐시 키",
      "4개 파일을 import. 필드 추가 → types → api → queryKeys → 여기 전부 수정",
      "공유 계약 없음 — api/todos.ts를 수동으로 재구현, 조용히 drift",
    ],
    afterNote:
      "타입·클라이언트·query key·뮤테이션·MSW 핸들러 — 모두 자동 파생. 동기화 불필요.",
  },
};

// ── Before: 5 separate files ───────────────────────────────────────────────

const BEFORE_FILES: { name: string; code: string }[] = [
  {
    name: "types.ts",
    code: `// Manually typed — must stay in sync with the server forever
export interface Todo {
  id: number
  title: string
  completed: boolean
  createdAt: string
}

export interface CreateTodoDto  { title: string }
export interface UpdateTodoDto  { title?: string; completed?: boolean }`,
  },
  {
    name: "lib/api.ts",
    code: `// Generic fetch wrapper — the cast makes TypeScript trust you, not verify
const BASE = process.env.NEXT_PUBLIC_API_URL!

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(\`\${BASE}\${path}\`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw new Error(\`\${res.status} \${path}\`)
  return res.json() as Promise<T>  // ← wrong shape passes silently
}`,
  },
  {
    name: "api/todos.ts",
    code: `import { apiFetch } from '../lib/api'
import type { Todo, CreateTodoDto, UpdateTodoDto } from '../types'

// 5 hand-rolled functions, 0 runtime validation
export const getTodos   = () =>
  apiFetch<Todo[]>('/todos')
export const getTodo    = (id: number) =>
  apiFetch<Todo>(\`/todos/\${id}\`)
export const createTodo = (body: CreateTodoDto) =>
  apiFetch<Todo>('/todos', { method: 'POST', body: JSON.stringify(body) })
export const updateTodo = (id: number, body: UpdateTodoDto) =>
  apiFetch<Todo>(\`/todos/\${id}\`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteTodo = (id: number) =>
  apiFetch<void>(\`/todos/\${id}\`, { method: 'DELETE' })`,
  },
  {
    name: "queryKeys.ts",
    code: `// Must mirror api/todos.ts exactly
// Add an endpoint? Update here too. Miss one? Wrong cache key.
export const todoKeys = {
  all:     ['todos'] as const,
  lists:   () => [...todoKeys.all, 'list'] as const,
  list:    () => [...todoKeys.lists()] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail:  (id: number) => [...todoKeys.details(), id] as const,
}`,
  },
  {
    name: "hooks/useTodos.ts",
    code: `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTodos, getTodo, createTodo, updateTodo, deleteTodo } from '../api/todos'
import { todoKeys } from '../queryKeys'
import type { CreateTodoDto, UpdateTodoDto } from '../types'

// Imports 4 files. Add a field → update types → api → queryKeys → here
export function useTodos() {
  return useQuery({ queryKey: todoKeys.list(), queryFn: getTodos })
}
export function useTodo(id: number) {
  return useQuery({ queryKey: todoKeys.detail(id), queryFn: () => getTodo(id) })
}
export function useCreateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  })
}
export function useUpdateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & UpdateTodoDto) =>
      updateTodo(id, body),
    onSuccess: (_d, { id }) =>
      qc.invalidateQueries({ queryKey: todoKeys.detail(id) }),
  })
}
export function useDeleteTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  })
}`,
  },
  {
    name: "mocks/handlers.ts",
    code: `import { http, HttpResponse } from 'msw'
import type { Todo } from '../types'

// No shared contract — re-implements api/todos.ts manually, drifts silently
let store: Todo[] = [{ id: 1, title: 'Buy milk', completed: false, createdAt: '2024-01-01' }]

export const handlers = [
  http.get('/todos', () => HttpResponse.json(store)),
  http.get('/todos/:id', ({ params }) =>
    HttpResponse.json(store.find(t => t.id === Number(params.id)))),
  http.post('/todos', async ({ request }) => {
    const body = await request.json() as CreateTodoDto
    const todo = { id: Date.now(), completed: false, createdAt: '2024', ...body } as Todo
    store.push(todo)
    return HttpResponse.json(todo, { status: 201 })
  }),
  http.patch('/todos/:id', async ({ params, request }) => {
    const patch = await request.json() as Partial<Todo>
    store = store.map(t => t.id === Number(params.id) ? { ...t, ...patch } : t)
    return HttpResponse.json(store.find(t => t.id === Number(params.id)))
  }),
  http.delete('/todos/:id', ({ params }) => {
    store = store.filter(t => t.id !== Number(params.id))
    return new HttpResponse(null, { status: 204 })
  }),
]`,
  },
];

// ── After: 1 file ──────────────────────────────────────────────────────────

const AFTER_FILE = {
  name: "services/todo.ts",
  code: `import { z } from 'zod'
import { endpoint, defineRouter, createApi, createFetchExecutor, type ApiTypes } from '@routar/core'
import { createQueries } from '@routar/react-query'
import { createMswHandlers } from '@routar/msw'

const TodoSchema = z.object({
  id: z.number(), title: z.string(), completed: z.boolean(), createdAt: z.string(),
})

const executor = createFetchExecutor(process.env.NEXT_PUBLIC_API_URL!)

export const todoRouter = defineRouter('/todos', {
  list:   endpoint({ method: 'GET',    path: '/',    response: z.array(TodoSchema) }),
  detail: endpoint({ method: 'GET',    path: '/:id', response: TodoSchema,
                     request: { path: z.object({ id: z.number() }) } }),
  create: endpoint({ method: 'POST',   path: '/',    response: TodoSchema,
                     request: { body: z.object({ title: z.string() }) } }),
  update: endpoint({ method: 'PATCH',  path: '/:id', response: TodoSchema,
                     request: { path: z.object({ id: z.number() }),
                                body: z.object({ title: z.string().optional(),
                                                 completed: z.boolean().optional() }) } }),
  delete: endpoint({ method: 'DELETE', path: '/:id', response: z.void(),
                     request: { path: z.object({ id: z.number() }) } }),
})

// Everything derived — runtime validated, no casts, no drift
export const todoApi   = createApi(executor, todoRouter)
export type  Todo      = ApiTypes<typeof todoApi>['detail']['response']
export const todoQuery = createQueries(todoApi)   // keys + queryFn + mutationFn
export const handlers  = createMswHandlers(todoRouter)  // same contract, zero duplication`,
};

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

export function BeforeAfterDemo({ lang = "en" }: { lang?: string }) {
  const copy = COPY[lang === "ko" ? "ko" : "en"];
  const [activeTab, setActiveTab] = useState(0);
  const [beforeHtml, setBeforeHtml] = useState<string[]>([]);
  const [afterHtml, setAfterHtml] = useState("");

  useEffect(() => {
    getHighlighter().then((h) => {
      const hi = (code: string) =>
        h.codeToHtml(code, { lang: "typescript", theme: "github-dark" });
      setBeforeHtml(BEFORE_FILES.map((f) => hi(f.code)));
      setAfterHtml(hi(AFTER_FILE.code));
    });
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h2 className={styles.title}>{copy.title}</h2>
        <p className={styles.subtitle}>{copy.subtitle}</p>
      </div>

      <div className={styles.grid}>
        {/* ── Before panel ── */}
        <div className={styles.panel} data-side="before">
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>
              <span className={styles.panelIcon} aria-hidden="true">
                ✕
              </span>
              {copy.beforeLabel}
            </span>
            <span className={styles.panelCount}>{copy.beforeCount}</span>
          </div>

          <div className={styles.tabs}>
            {BEFORE_FILES.map((f, i) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setActiveTab(i)}
                className={`${styles.tab} ${i === activeTab ? styles.tabActive : ""}`}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div className={styles.note} data-side="before">
            {copy.fileNotes[activeTab]}
          </div>

          <div className={styles.code}>
            {beforeHtml[activeTab] ? (
              // eslint-disable-next-line react/no-danger
              <div
                dangerouslySetInnerHTML={{ __html: beforeHtml[activeTab] }}
              />
            ) : (
              <div className={styles.skeleton} />
            )}
          </div>
        </div>

        {/* ── Center arrow ── */}
        <div className={styles.vsCol} aria-hidden="true">
          <div className={styles.vsArrow}>
            <span className={styles.arrowH}>→</span>
            <span className={styles.arrowV}>↓</span>
          </div>
        </div>

        {/* ── After panel ── */}
        <div className={styles.panel} data-side="after">
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>
              <span className={styles.panelIcon} aria-hidden="true">
                ✓
              </span>
              {copy.afterLabel}
            </span>
            <span className={styles.panelCount}>{copy.afterCount}</span>
          </div>

          <div className={styles.tabs}>
            <div className={`${styles.tab} ${styles.tabActive}`}>
              {AFTER_FILE.name}
            </div>
          </div>

          <div className={styles.note} data-side="after">
            {copy.afterNote}
          </div>

          <div className={styles.code}>
            {afterHtml ? (
              // eslint-disable-next-line react/no-danger
              <div dangerouslySetInnerHTML={{ __html: afterHtml }} />
            ) : (
              <div className={styles.skeleton} />
            )}
          </div>
        </div>
      </div>

      <div className={styles.reduction}>{copy.reduction}</div>
    </div>
  );
}
