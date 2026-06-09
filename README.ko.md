# routar
<img width="1200" height="630" alt="image" src="https://github.com/user-attachments/assets/190ada89-90f8-41fc-86b7-14ba37a628b2" />


[🇺🇸 English](README.md)

[![CI](https://github.com/minr2kb/routar/actions/workflows/ci.yml/badge.svg)](https://github.com/minr2kb/routar/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@routar/core)](https://www.npmjs.com/package/@routar/core)
[![Bundle Size](https://img.shields.io/bundlejs/size/@routar/core)](https://www.npmjs.com/package/@routar/core)
[![Coverage](https://codecov.io/gh/minr2kb/routar/branch/main/graph/badge.svg)](https://codecov.io/gh/minr2kb/routar)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**스키마 기반 HTTP API 클라이언트 — 엔드-투-엔드 타입 안정성과 런타임 검증을 제공합니다.**

API를 한 번 정의하고 어떤 전송 계층, 환경, HTTP 클라이언트에서도 재사용하세요.

> 백엔드 협업이나 OpenAPI 스펙 없이 API 스키마를 직접 관리하는 프론트엔드 팀을 위해 만들었습니다.

```ts
import { z } from 'zod';
import { endpoint, defineRouter, createApi } from '@routar/core';
import { createFetchExecutor } from '@routar/core';

const TodoSchema = z.object({ id: z.number(), title: z.string(), completed: z.boolean() });

const todoRouter = defineRouter('/todos', {
  getList:   endpoint({ method: 'GET',  path: '/',    response: z.array(TodoSchema) }),
  getDetail: endpoint({ method: 'GET',  path: '/:id', response: TodoSchema,
                        request: z.object({ path: z.object({ id: z.number() }) }) }),
  create:    endpoint({ method: 'POST', path: '/',    response: TodoSchema,
                        request: z.object({ body: z.object({ title: z.string() }) }) }),
});

const todoApi = createApi(createFetchExecutor('https://api.example.com'), todoRouter);

const todos = await todoApi.getList({});                     // Todo[]
const todo  = await todoApi.getDetail({ path: { id: 1 } }); // Todo
const next  = await todoApi.create({ body: { title: 'buy milk' } }); // Todo
```

---

## 특징

- **엔드-투-엔드 타입 추론** — 요청 파라미터, 응답 형태, 어댑터 출력까지 `any` 없이 전부 추론
- **런타임 검증** — Zod, Valibot, Yup 또는 `.parse()`를 가진 객체라면 무엇이든 요청·응답 검증에 사용 가능
- **전송 계층 독립** — 한 줄 변경으로 `fetch`, axios, 또는 커스텀 HTTP 클라이언트로 교체
- **플러그인 시스템** — request/response/error 훅을 가진 이름 있는 플러그인; `retry`와 `timeout`은 first-class 옵션
- **중첩 라우터** — URL 구조를 타입 시스템에 그대로 반영
- **경로 파라미터 강제** — `request.path.id`가 없는데 `path: '/:id'`를 쓰면 컴파일 에러
- **SSR/CSR 지원** — 동일한 엔드포인트 스펙, 환경에 따라 다른 executor

---

## 패키지

| 패키지 | 설명 |
|--------|------|
| `@routar/core` | 엔드포인트 정의, 라우터, API 클라이언트, 플러그인 시스템, 네이티브 `fetch` executor |
| `@routar/axios` | Axios 기반 Executor |
| `@routar/ky` | [ky](https://github.com/sindresorhus/ky) 기반 Executor |
| `@routar/react-query` | TanStack Query 바인딩 — 라우터에서 타입이 적용된 `queryOptions` / `mutationOptions` 팩토리 생성 |

---

## TanStack Query 통합

`@routar/react-query`는 routar 라우터에서 타입이 적용된 `queryOptions` / `mutationOptions` 팩토리를 직접 파생합니다. 새로운 훅 API가 없으며 TanStack의 기본 훅을 그대로 사용합니다.

```bash
npm install @routar/react-query @tanstack/react-query
```

```ts
// remote/services/todo.ts
import { createApi, defineRouter } from '@routar/core'
import { createQueries } from '@routar/react-query'

export const TodoRouter = defineRouter('/todos', { /* ... */ })
export const todoApi = createApi(executor, TodoRouter)
export const todoQuery = createQueries(todoApi)
```

```tsx
// 쿼리 — useSuspenseQuery, prefetchQuery 등
const { data } = useSuspenseQuery(todoQuery.getList())

// 뮤테이션 — 선언적 무효화 포함
const { mutate } = useMutation(
  todoQuery.create({ invalidates: [todoQuery.getList.queryKey()] })
)
```

선언적 `invalidates`를 활성화하려면 `QueryClient` 생성 시 `routarMutationCache`를 한 번 배선하세요:

```ts
import { routarMutationCache } from '@routar/react-query'

let queryClient: QueryClient
queryClient = new QueryClient({ mutationCache: routarMutationCache(() => queryClient) })
```

---

## routar를 쓰지 말아야 할 때

routar는 **프론트엔드 팀이 API 스키마를 직접 소유하고 관리할 때** 적합합니다.

아래 상황에서는 다른 도구를 고려하세요:

| 상황 | 더 나은 선택 |
|------|-------------|
| 이미 OpenAPI / Swagger 스펙이 있는 경우 | [orval](https://orval.dev/) 또는 [hey-api](https://heyapi.dev/) — 스펙에서 클라이언트 자동 생성 |
| 백엔드·프론트엔드 공유 계약이 필요한 경우 | [ts-rest](https://ts-rest.com/) 또는 [oRPC](https://orpc.unnoq.com/) — 양쪽이 동일한 스키마 공유 |
| RPC 스타일 풀스택 타입 안정성이 필요한 경우 | [tRPC](https://trpc.io/) |

---

## 설치

```bash
# fetch 사용 (core에 내장)
npm install @routar/core

# axios 사용
npm install @routar/core @routar/axios axios

# ky 사용
npm install @routar/core @routar/ky ky
```

---

## 빠른 시작

```ts
import { z } from 'zod';
import { endpoint, defineRouter, createApi } from '@routar/core';
import type { ApiTypes } from '@routar/core';
import { createFetchExecutor } from '@routar/core';

const TodoSchema = z.object({ id: z.number(), title: z.string(), completed: z.boolean() });

const todoRouter = defineRouter('/todos', {
  getList: endpoint({
    method: 'GET',
    path: '/',
    response: z.array(TodoSchema),
  }),
  getDetail: endpoint({
    method: 'GET',
    path: '/:id',
    request: z.object({ path: z.object({ id: z.number() }) }),
    response: TodoSchema,
  }),
  create: endpoint({
    method: 'POST',
    path: '/',
    request: z.object({ body: z.object({ title: z.string() }) }),
    response: TodoSchema,
  }),
});

const executor = createFetchExecutor('https://api.example.com');
const todoApi  = createApi(executor, todoRouter);

// 클라이언트에서 타입 추출 — 중복 없음
type TodoApiTypes   = ApiTypes<typeof todoApi>;
type Todo           = TodoApiTypes['getDetail']['response']; // { id: number; title: string; completed: boolean }
type CreateRequest  = TodoApiTypes['create']['request'];     // { body: { title: string } }
```

---

## 핵심 API

### `endpoint(spec)`

단일 엔드포인트를 정의합니다. `adapter`에 대한 완전한 타입 추론을 캐스팅 없이 제공합니다.

```ts
// adapter 사용 — raw는 response 스키마에서 추론됨
endpoint({
  method: 'GET',
  path: '/',
  response: z.array(TodoRawSchema),
  adapter: (raw) => raw.map(toTodoItem), // raw: z.infer<typeof TodoRawSchema>[]
});
```

**경로 파라미터 강제** — 경로 파라미터 불일치는 컴파일 에러입니다:

```ts
// ✅
endpoint({ path: '/:id', request: z.object({ path: z.object({ id: z.number() }) }), ... })

// ❌ 컴파일 에러 — ':id'가 선언됐지만 request.path.id가 없음
endpoint({ path: '/:id', request: z.object({ query: z.object({ q: z.string() }) }), ... })
```

---

### `defineRouter(prefix, endpoints)`

엔드포인트들을 공통 URL 접두사 아래 묶습니다. 무한 중첩을 지원합니다.

```ts
const apiRouter = defineRouter('/api', {
  users: defineRouter('/users', {
    getList:   endpoint({ method: 'GET', path: '/',    response: UserListSchema }),
    getDetail: endpoint({ method: 'GET', path: '/:id', response: UserSchema }),

    todos: defineRouter('/todos', {
      getList: endpoint({ method: 'GET', path: '/', response: TodoListSchema }),
    }),
  }),
});

const api = createApi(executor, apiRouter);

await api.users.getList({});                         // GET /api/users
await api.users.getDetail({ path: { id: 1 } });      // GET /api/users/1
await api.users.todos.getList({});                   // GET /api/users/todos
```

---

### `createApi(executor, router)`

완전히 타입이 지정된 API 클라이언트를 생성합니다. 각 엔드포인트는 `(params, signal?) => Promise<Response>` 형태의 비동기 함수가 됩니다.

```ts
// 세 가지 동등한 형태
const api = createApi(executor, todoRouter);
const api = createApi(executor, '/todos', { getList: endpoint({ ... }) });
const api = createApi(executor, { getList: endpoint({ ... }) });
```

요청 파라미터는 `{ path?, query?, body? }` 형태를 따릅니다:

```ts
await api.update({
  path:  { id: 1 },
  body:  { completed: true },
  query: { version: 2 },
});
```

---

### `createExecutor(transport, options?)`

`@routar/axios`와 `@routar/ky` 내부에서 사용하는 저수준 팩토리입니다. 임의의 HTTP 클라이언트를 연결할 때 사용하세요.

```ts
import { createExecutor } from '@routar/core';

const executor = createExecutor(
  async ({ method, url, body, headers, signal }) => {
    const res = await myClient.request({ method, url, body, headers, signal });
    return res.data;
  },
  { plugins: [authPlugin] },
);
```

---

### `dispatchExecutor(resolver)`

요청 시점에 전송 계층을 선택하는 executor를 만듭니다. SSR과 CSR을 하나의 API 클라이언트로 통합할 때 유용합니다 — `*ServerApi` 인스턴스를 중복으로 만들 필요가 없습니다.

`resolver`는 요청 옵션 전체를 받으므로 환경, URL 접두사, 인증 컨텍스트 등 런타임 조건에 따라 분기할 수 있습니다.

```ts
import { dispatchExecutor } from '@routar/core';

// 환경에 따라 전송 계층 선택 (SSR vs CSR)
const executor = dispatchExecutor(() =>
  typeof window === 'undefined' ? serverExecutor : clientExecutor,
);

// 또는 요청 경로에 따라 라우팅
const executor = dispatchExecutor((opts) =>
  opts.url.startsWith('/internal') ? internalExecutor : publicExecutor,
);
```

---

## 플러그인

플러그인은 `onRequest`, `onResponse`, `onError` 훅을 가진 이름 있는 객체입니다. `createExecutor`의 `plugins` 옵션에 배열로 전달합니다. `retry`와 `timeout`은 별도 옵션입니다.

```ts
import { createExecutor, definePlugin, logger } from '@routar/core';

const authPlugin = definePlugin({
  name: 'auth',
  onRequest: async (opts) => ({
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${await getToken()}` },
  }),
  onError: async (err) => {
    if (isUnauthorized(err)) await refreshToken();
    throw err;
  },
});

const executor = createExecutor(transport, {
  plugins: [authPlugin, logger({ log: (msg, data) => logger.debug(msg, data) })],
});
```

**커스텀 플러그인:**

```ts
const correlationPlugin = definePlugin({
  onRequest: (opts) => ({
    ...opts,
    headers: { ...opts.headers, 'X-Request-Id': crypto.randomUUID() },
  }),
});
```

| | 설명 |
|--|------|
| `plugins` | 선언 순서대로 적용되는 `ExecutorPlugin` 배열 (첫 번째가 가장 바깥쪽) |
| `logger` | 내장 플러그인: 메서드, URL, 소요 시간 로깅 |

`retry`와 `timeout`은 `createFetchExecutor`에서 사용합니다 — axios, ky는 각 라이브러리 인스턴스에서 설정합니다.

---

## Executors

### `createFetchExecutor(baseURL, options?)`  `@routar/core`

네이티브 `fetch` API를 사용합니다. 요청마다 동적 헤더가 필요한 SSR 환경에 적합합니다.

`baseURL`은 정적 문자열뿐 아니라 매 요청마다 호출되는 동기/비동기 팩토리도 받습니다 — origin이 런타임 환경에 따라 달라질 때(예: 서버에서는 절대 URL, 클라이언트에서는 상대 경로) 유용합니다:

```ts
const executor = createFetchExecutor(
  () => (typeof window === 'undefined' ? 'http://localhost:3000/api' : '/api'),
);
```

```ts
import { createFetchExecutor } from '@routar/core';

const executor = createFetchExecutor('https://api.example.com', {
  defaultHeaders: async () => {
    const token = await getServerToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  retry: 2,
  timeout: 5000,
});
```

2xx가 아닌 응답은 `HttpError`를 던집니다:

```ts
import { HttpError } from '@routar/core';

if (err instanceof HttpError) console.log(err.status, err.statusText, err.body);
```

---

### `createAxiosExecutor(instanceOrFactory, options?)`  `@routar/axios`

`AxiosInstance`(CSR) 또는 팩토리 함수(SSR)를 받습니다.

```ts
import { createAxiosExecutor } from '@routar/axios';

// CSR — 공유 인스턴스
const executor = createAxiosExecutor(axios.create({ baseURL: 'https://api.example.com' }));

// SSR — 팩토리, 요청마다 새 인스턴스 생성
const executor = createAxiosExecutor(async () => {
  const token = await getServerToken();
  return axios.create({ baseURL: 'https://api.example.com', headers: { Authorization: `Bearer ${token}` } });
});
```

HTTP 실패는 (fetch executor와 동일하게) `HttpError`로 정규화됩니다. 원본 `AxiosError`는 `err.cause`에 보존되므로 Axios 고유 필드(`err.cause.config`, `err.cause.code`)에 계속 접근할 수 있습니다.

---

## SSR / CSR 패턴

`dispatchExecutor`를 사용해 요청 시점에 올바른 전송 계층을 선택하세요 — `*ServerApi` 인스턴스 중복 없이 하나의 API 클라이언트가 두 환경 모두에서 동작합니다.

```ts
import { dispatchExecutor } from '@routar/core';

// executor.ts
const clientExecutor = createAxiosExecutor(axios.create({ baseURL: BASE_URL }));
const serverExecutor = createFetchExecutor(BASE_URL, {
  defaultHeaders: async () => {
    const { cookies } = await import('next/headers');
    const token = (await cookies()).get('access_token')?.value;
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export const apiExecutor = dispatchExecutor(() =>
  typeof window === 'undefined' ? serverExecutor : clientExecutor,
);

// remote/services/todo.ts — SSR과 CSR 모두에서 동작하는 하나의 클라이언트
export const todoApi = createApi(apiExecutor, todoRouter);
```

> **Next.js App Router 주의:** Server Component 내부에서는 `typeof window === 'undefined'`가 항상 `true`를 반환합니다. App Router Server Component를 사용한다면 이 조건에 의존하지 말고 올바른 executor를 직접 전달하세요.

인증이 필요 없는 라우트(예: 절대 URL을 사용하는 자체 API)라면 `dispatchExecutor` 없이 fetch executor 하나로 충분합니다:

```ts
export const localExecutor = createFetchExecutor('http://localhost:3000/api');
export const todoApi = createApi(localExecutor, todoRouter);
```

---

## 타입 유틸리티

### `ApiTypes<TApi>`

API 클라이언트에서 요청·응답 타입을 추출합니다.

```ts
import type { ApiTypes } from '@routar/core';

type TodoApiTypes = ApiTypes<typeof todoApi>;
type CreateRequest  = TodoApiTypes['create']['request'];  // { body: { title: string } }
type CreateResponse = TodoApiTypes['create']['response']; // Todo
```

### `PathParams<TPath>`

경로 문자열에서 `:param` 이름을 유니온 타입으로 추출합니다.

```ts
type P = PathParams<'/:userId/posts/:postId'>; // 'userId' | 'postId'
```

---

## 프레임워크 없이 사용하기

routar는 프레임워크 없이도 동작합니다 — 엔드포인트는 일반 비동기 함수입니다:

```ts
const todoApi = createApi(createFetchExecutor('https://api.example.com'), todoRouter);

// 직접 호출
const todos = await todoApi.getList({});
renderTodoList(todos); // todos는 Todo[]로 타입 추론됨

// AbortSignal로 진행 중인 요청 취소
const controller = new AbortController();
const todo = await todoApi.getDetail({ path: { id: 1 } }, controller.signal);
controller.abort();
```

---

## 에러 타입

| 에러 | 패키지 | 발생 조건 |
|------|--------|----------|
| `ValidationError` | `@routar/core` | `request.parse()` 또는 `response.parse()` 실패 시 |
| `TimeoutError` | `@routar/core` | `timeout` 옵션 제한 시간 초과 시 |
| `HttpError` | `@routar/core` | 모든 executor(fetch, Axios, ky)가 2xx가 아닌 상태 코드 반환 시 — 원본 트랜스포트 에러는 `err.cause`에 보존 |

```ts
import { TimeoutError, ValidationError } from '@routar/core';
import { HttpError } from '@routar/core';

try {
  await todoApi.create({ body: { title: '' } });
} catch (err) {
  if (err instanceof ValidationError) console.log(err.message); // cause는 non-enumerable
  if (err instanceof HttpError)       console.log(err.status, err.statusText, err.body);
  if (err instanceof TimeoutError)    console.log(`${err.ms}ms 후 타임아웃`);
}
```
