# routar

TypeScript-first HTTP API client 라이브러리. 엔드포인트를 한 곳에 정의하면 request/response 타입이 자동으로 추론되는 타입 안전한 API 클라이언트를 만들 수 있습니다.

- **End-to-end 타입 추론** — 엔드포인트 정의에서 API 클라이언트 호출까지 `any` 없이
- **Transport 독립** — fetch, axios, 또는 직접 구현한 어떤 HTTP 클라이언트도 사용 가능
- **미들웨어 체계** — retry, timeout, logging 등을 조합 가능한 composable 미들웨어
- **Validator 독립** — Zod, Valibot, Yup 등 `parse` 메서드가 있는 어느 라이브러리도 사용 가능
- **경로 파라미터 강제** — `path: '/:id'` 와 `request.path.id` 불일치를 컴파일 타임에 잡아냄

---

## 왜 만들었나

### API 레이어에서 반복되는 세 가지 문제

코드베이스가 커질수록 API 레이어에는 다음 세 가지 문제가 반드시 등장한다.

| 문제 | 설명 |
|------|------|
| **명세 불명확** | Request 타입에서 path param인지 query인지 body인지 구분할 방법이 없다 |
| **관계성 부재** | Request 타입과 Response 타입 사이의 연결고리가 코드에 없다 |
| **런타임 무방비** | TypeScript 타입은 컴파일 타임에만 존재한다. 서버가 잘못된 응답을 내려도 런타임에서는 감지하지 못한다 |

Zod 같은 런타임 검증 라이브러리로 세 번째는 해결할 수 있다. 그러나 다음 문제가 곧 따라온다.

**transform 오염**: `z.transform`으로 서버 응답을 클라이언트 모델로 변환하면 스키마가 `ZodEffects`로 감싸진다. `.extend()`, `.merge()`, `.partial()` 같은 조합 연산이 불가능해지고, 스키마 재사용성이 무너진다.

```ts
// ❌ transform을 schema 안에 넣으면 ZodEffects로 오염
const TodoSchema = TodoRawSchema.transform(raw => ({
  ...raw,
  label: raw.completed ? `✓ ${raw.title}` : raw.title,
}));
// TodoSchema.extend(...)  → 타입 에러

// ✅ Raw schema와 변환 함수를 분리
const TodoRawSchema = z.object({ id: z.number(), title: z.string(), completed: z.boolean() });
const toTodoItem = (raw: z.infer<typeof TodoRawSchema>) => ({
  ...raw,
  label: raw.completed ? `✓ ${raw.title}` : raw.title,
});
```

이 원칙이 routar의 `response` + `adapter` 분리 설계로 이어졌다.

### 핵심 통찰 — 스펙과 실행의 분리

SSR/CSR 이중 환경이 결정적인 계기였다. 서버 컴포넌트는 httpOnly 쿠키를 자동 전송할 수 없어서, 같은 엔드포인트 스펙을 CSR용과 SSR용으로 중복 작성해야 했다.

**해결 아이디어: 스펙은 한 번 정의하고, 실행 환경(executor)만 교체한다.**

```ts
// 스펙은 한 번만 정의
export const TodoRouter = defineRouter('/todos', {
  getList:   endpoint({ method: 'GET', path: '/',    response: TodoListSchema }),
  getDetail: endpoint({ method: 'GET', path: '/:id', response: TodoSchema }),
});

// 실행 환경만 교체 — 스펙 재사용
export const todoApi       = createApi(clientExecutor, TodoRouter); // CSR (axios)
export const todoServerApi = createApi(serverExecutor, TodoRouter); // SSR (fetch + 쿠키)
```

### 설계 원칙

**1. 구조가 필요를 앞서지 않기**
단순함부터 시작한다. 엔드포인트를 `createApi`에 인라인으로 작성하다가, 재사용이 필요할 때만 `defineRouter`로 분리한다. 과도한 추상화를 강요하지 않는다.

**2. 스펙과 실행의 분리**
엔드포인트 정의(무엇을 호출하는가)와 HTTP 실행(어떻게 호출하는가)을 명확히 분리한다. 같은 스펙으로 fetch, axios, mock executor를 자유롭게 교체할 수 있다.

**3. 레이어 간 단방향 의존**
컴포넌트 → query hooks → api client → executor. 상위 레이어는 하위 레이어의 구현을 알지 못한다. 컴포넌트는 URL이나 HTTP 클라이언트의 존재를 알 필요가 없다.

**4. 타입과 런타임의 통합**
TypeScript 타입이 컴파일 타임에만 존재하는 것이 아니라, 런타임에서도 동일한 스키마로 요청/응답을 검증한다. 타입과 실제 동작이 항상 일치한다.

**5. 공개 타입은 구현에서 역산**
스키마를 직접 export하지 않고, `ApiTypes<typeof api>`로 함수 시그니처에서 타입을 추출한다. 내부 구현을 바꿔도 공개 타입이 자동으로 반영된다.

---

## 패키지 구성

| 패키지 | 설명 |
|--------|------|
| `@routar/core` | 엔드포인트 정의, 라우터, API 클라이언트, 미들웨어 시스템 |
| `@routar/fetch` | 브라우저/Node.js `fetch` 기반 executor |
| `@routar/axios` | Axios 기반 executor |

---

## 설치

```bash
# fetch executor 사용 시
npm install @routar/core @routar/fetch

# axios executor 사용 시
npm install @routar/core @routar/axios axios
```

---

## 빠른 시작

```ts
import { z } from 'zod';
import { endpoint, defineRouter, createApi } from '@routar/core';
import { createFetchExecutor } from '@routar/fetch';

// 1. 스키마 정의
const TodoSchema = z.object({
  id: z.number(),
  title: z.string(),
  completed: z.boolean(),
});

// 2. 엔드포인트 정의
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
    request: z.object({
      body: z.object({ title: z.string(), completed: z.boolean().default(false) }),
    }),
    response: TodoSchema,
  }),
});

// 3. Executor + API 클라이언트 생성
const executor = createFetchExecutor('https://api.example.com');
const todoApi = createApi(executor, todoRouter);

// 4. 사용 — 모두 타입 추론됨
const todos = await todoApi.getList({});                         // Todo[]
const todo  = await todoApi.getDetail({ path: { id: 1 } });     // Todo
const newTodo = await todoApi.create({ body: { title: '할 일' } }); // Todo
```

---

## 핵심 개념

### 1. 데이터 흐름

```
endpoint() 정의
    └─ defineRouter(prefix, endpoints)
         └─ createApi(executor, router)
              └─ api.someEndpoint(params)
                    ├─ request.parse(params)    ← 요청 검증
                    ├─ URL 빌드 (prefix + path + path params)
                    ├─ executor.execute(opts)   ← HTTP 전송
                    ├─ response.parse(raw)      ← 응답 검증
                    └─ adapter(validated)       ← 데이터 변환 (optional)
```

### 2. Request 구조

엔드포인트 함수는 항상 `{ path?, query?, body? }` 형태의 파라미터를 받습니다.

```ts
await api.search({
  path:  { id: 1 },               // URL 경로 파라미터 (:id)
  query: { page: 1, limit: 20 },  // 쿼리스트링
  body:  { title: '수정된 제목' }, // 요청 본문
});
```

---

## API 레퍼런스

### `endpoint(spec)`

타입 안전한 엔드포인트 정의 헬퍼. 일반 객체 리터럴 대신 이 함수를 사용하면 `adapter`의 `raw` 파라미터 타입이 자동으로 추론됩니다.

```ts
import { endpoint } from '@routar/core';

// request 없음 + adapter 없음
endpoint({
  method: 'GET',
  path: '/health',
  response: HealthSchema,
});

// request 있음
endpoint({
  method: 'GET',
  path: '/:id',
  request: z.object({ path: z.object({ id: z.number() }) }),
  response: TodoSchema,
});

// adapter 있음 — raw 타입이 response 스키마 출력 타입으로 자동 추론
endpoint({
  method: 'GET',
  path: '/',
  response: z.array(TodoRawSchema),
  adapter: (raw) => raw.map(toTodoItem), // raw: z.infer<typeof TodoRawSchema>[]
});

// 네 가지 조합 모두 지원
endpoint({ method, path, request, response, adapter });
endpoint({ method, path, request, response });
endpoint({ method, path, response, adapter });
endpoint({ method, path, response });
```

**경로 파라미터 강제**

`path`에 `:param`이 있으면, `request.path`에 해당 키가 없을 때 컴파일 에러가 발생합니다.

```ts
// ✅ 정상
endpoint({
  path: '/:id',
  request: z.object({ path: z.object({ id: z.number() }) }),
  response: TodoSchema,
});

// ❌ 컴파일 에러 — ':id'가 있는데 request.path.id 없음
endpoint({
  path: '/:id',
  request: z.object({ query: z.object({ filter: z.string() }) }),
  response: TodoSchema,
});
```

---

### `defineRouter(prefix, endpoints)`

엔드포인트들을 공통 URL prefix 아래 묶어 라우터 정의를 만듭니다. 값으로 또 다른 `defineRouter`를 넣으면 중첩 라우터가 됩니다.

```ts
import { defineRouter } from '@routar/core';

export const userRouter = defineRouter('/users', {
  getList:   endpoint({ method: 'GET',    path: '/',    response: UserListSchema }),
  getDetail: endpoint({ method: 'GET',    path: '/:id', request: IdRequest, response: UserSchema }),
  create:    endpoint({ method: 'POST',   path: '/',    request: CreateRequest, response: UserSchema }),
  update:    endpoint({ method: 'PATCH',  path: '/:id', request: UpdateRequest, response: UserSchema }),
  remove:    endpoint({ method: 'DELETE', path: '/:id', request: IdRequest, response: z.unknown() }),
});
```

#### 중첩 라우터

`defineRouter` 결과를 다른 `defineRouter`의 값으로 넣으면 prefix가 합쳐지고, API 클라이언트도 중첩 객체 구조로 생성됩니다.

```ts
export const apiRouter = defineRouter('/api', {
  users: defineRouter('/users', {
    getList:   endpoint({ method: 'GET',  path: '/',    response: UserListSchema }),
    getDetail: endpoint({
      method: 'GET',
      path: '/:id',
      request: z.object({ path: z.object({ id: z.number() }) }),
      response: UserSchema,
    }),

    // 3단계 중첩도 가능
    todos: defineRouter('/todos', {
      getList:   endpoint({ method: 'GET',  path: '/',    response: TodoListSchema }),
      getDetail: endpoint({
        method: 'GET',
        path: '/:id',
        request: z.object({ path: z.object({ id: z.number() }) }),
        response: TodoSchema,
      }),
    }),
  }),

  posts: defineRouter('/posts', {
    getList: endpoint({ method: 'GET', path: '/', response: PostListSchema }),
  }),
});
```

생성된 API 클라이언트는 중첩 구조 그대로 반영됩니다.

```ts
const api = createApi(executor, apiRouter);

// URL: GET /api/users
await api.users.getList({});

// URL: GET /api/users/1
await api.users.getDetail({ path: { id: 1 } });

// URL: GET /api/users/todos
await api.users.todos.getList({});

// URL: GET /api/users/todos/5
await api.users.todos.getDetail({ path: { id: 5 } });

// URL: GET /api/posts
await api.posts.getList({});
```

모든 단계의 타입이 완전히 추론됩니다. `api.users.todos.getDetail`의 파라미터 타입, 반환 타입 모두 IDE에서 자동 완성됩니다.

---

### `createApi(executor, router)`

라우터와 executor를 결합해 완전히 타입화된 API 클라이언트를 생성합니다.

**세 가지 호출 형태:**

```ts
import { createApi } from '@routar/core';

// 형태 1: defineRouter 결과를 직접 전달 (권장)
const todoApi = createApi(executor, todoRouter);

// 형태 2: prefix와 endpoints를 인라인으로
const todoApi = createApi(executor, '/todos', {
  getList: endpoint({ method: 'GET', path: '/', response: TodoListSchema }),
});

// 형태 3: prefix 없이 endpoint map만
const todoApi = createApi(executor, {
  ping: endpoint({ method: 'GET', path: '/ping', response: z.unknown() }),
});
```

**생성된 클라이언트 사용:**

```ts
// 각 메서드는 (params, signal?) 형태
const list   = await todoApi.getList({});
const detail = await todoApi.getDetail({ path: { id: 1 } });

// AbortSignal 지원
const controller = new AbortController();
const list = await todoApi.getList({}, controller.signal);
```

**타입 추출:**

```ts
import type { ApiTypes } from '@routar/core';

type TodoApiTypes = ApiTypes<typeof todoApi>;
type GetListRequest  = TodoApiTypes['getList']['request'];   // 요청 파라미터 타입
type GetListResponse = TodoApiTypes['getList']['response'];  // 응답 타입
```

---

### `createExecutor(execute, middlewares?)`

transport 함수와 미들웨어 체인을 결합해 `Executor`를 만드는 저수준 팩토리.
`@routar/fetch`, `@routar/axios`가 내부적으로 이 함수를 사용합니다.

```ts
import { createExecutor } from '@routar/core';

const executor = createExecutor(
  async ({ method, url, params, body, headers, signal }) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    return res.json();
  },
  [withTimeout(5000), withRetry(3), withLogger()],
);
```

---

## 미들웨어

미들웨어는 `(opts, next) => Promise<unknown>` 형태의 함수입니다. 선언 순서대로 실행되며, 첫 번째가 가장 바깥 래퍼입니다.

### `defineMiddleware(fn)`

타입 추론을 위한 identity 헬퍼. 이 함수로 감싸면 `opts`와 `next`의 타입이 자동으로 추론됩니다.

```ts
import { defineMiddleware } from '@routar/core';

const withCorrelationId = defineMiddleware((opts, next) =>
  next({
    ...opts,
    headers: { ...opts.headers, 'X-Request-Id': crypto.randomUUID() },
  })
);
```

### `withRetry(count, options?)`

실패한 요청을 최대 `count`회 재시도합니다.

```ts
import { withRetry } from '@routar/core';

// 기본 — 모든 에러에서 3회 재시도
withRetry(3)

// shouldRetry 옵션 — 특정 조건에서만 재시도
withRetry(3, {
  shouldRetry: (err, attempt) => {
    if (err instanceof HttpError && err.status < 500) return false; // 4xx는 재시도 안 함
    return true;
  },
})
```

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `count` | `number` | 재시도 횟수 (최초 시도 미포함) |
| `options.shouldRetry` | `(error, attempt) => boolean` | `false` 반환 시 재시도 중단 |

### `withTimeout(ms)`

`ms` 밀리초 내에 응답이 없으면 요청을 중단합니다. 기존 `AbortSignal`과 병합되어 먼저 발화하는 쪽이 우선합니다.

```ts
import { withTimeout } from '@routar/core';

withTimeout(5000) // 5초 초과 시 abort
```

### `withLogger(options?)`

요청 시작, 성공(소요 시간), 실패를 로깅합니다.

```ts
import { withLogger } from '@routar/core';

// 기본 — console.log 사용
withLogger()

// 커스텀 로거
withLogger({
  log: (message, data) => logger.debug(message, data),
})
```

### 미들웨어 조합 예시

```ts
const executor = createExecutor(fetchTransport, [
  withTimeout(10_000),   // 1. 타임아웃 설정 (가장 먼저 실행)
  withRetry(3, {         // 2. 실패 시 재시도
    shouldRetry: (err) => !(err instanceof HttpError && err.status < 500),
  }),
  withLogger(),          // 3. 로깅 (가장 안쪽)
]);
```

---

## Executor

### `createFetchExecutor(baseURL, options?)`

`@routar/fetch`

브라우저/Node.js 내장 `fetch`를 transport로 사용하는 executor. SSR 환경에서 요청마다 동적 헤더(예: 인증 토큰)가 필요한 경우 적합합니다.

```ts
import { createFetchExecutor } from '@routar/fetch';

const executor = createFetchExecutor('https://api.example.com', {
  // 요청마다 호출되는 비동기 헤더 팩토리
  defaultHeaders: async () => {
    const token = await getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  middlewares: [withTimeout(5000), withRetry(2)],
});
```

| 옵션 | 타입 | 설명 |
|------|------|------|
| `baseURL` | `string` | 모든 요청에 붙는 절대 base URL |
| `options.defaultHeaders` | `() => Record<string, string> \| Promise<...>` | 요청마다 호출되는 헤더 팩토리 |
| `options.middlewares` | `ExecutorMiddleware[]` | 미들웨어 체인 |

**에러 처리:** 2xx가 아닌 응답은 `HttpError`를 던집니다.

```ts
import { HttpError } from '@routar/fetch';

try {
  await todoApi.getDetail({ path: { id: 999 } });
} catch (err) {
  if (err instanceof HttpError) {
    console.log(err.status);     // 404
    console.log(err.statusText); // "Not Found"
  }
}
```

---

### `createAxiosExecutor(instanceOrFactory, options?)`

`@routar/axios`

Axios를 transport로 사용하는 executor. CSR에서는 인스턴스를 직접 전달하고, SSR에서는 요청마다 인스턴스를 생성하는 factory를 전달합니다.

```ts
import axios from 'axios';
import { createAxiosExecutor } from '@routar/axios';

// CSR — 공유 인스턴스 (interceptor, connection pooling 유지)
const clientExecutor = createAxiosExecutor(
  axios.create({ baseURL: 'https://api.example.com' })
);

// SSR — factory (요청마다 동적 헤더 생성)
const serverExecutor = createAxiosExecutor(async () => {
  const token = await getTokenFromCookies();
  return axios.create({
    baseURL: 'https://api.example.com',
    headers: { Authorization: `Bearer ${token}` },
  });
});
```

Axios 에러는 `AxiosError` 원본 그대로 전달되므로 `err.response`, `err.config` 등 모든 Axios 정보를 그대로 사용할 수 있습니다.

---

## SSR / CSR 이중 executor 패턴

Next.js 등 SSR/CSR이 공존하는 환경에서 라우터는 공유하고 executor만 교체하는 패턴입니다.

```ts
// remote/lib/executor.ts
import axios from 'axios';
import { createAxiosExecutor } from '@routar/axios';
import { createFetchExecutor } from '@routar/fetch';

const BASE_URL = 'https://api.example.com';

// CSR — axios 공유 인스턴스
export const clientExecutor = createAxiosExecutor(
  axios.create({ baseURL: BASE_URL })
);

// SSR — fetch + 동적 인증 헤더
export const serverExecutor = createFetchExecutor(BASE_URL, {
  defaultHeaders: async () => {
    const { cookies } = await import('next/headers');
    const token = (await cookies()).get('access_token')?.value;
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});
```

```ts
// remote/services/todo/todo.api.ts
export const todoApi       = createApi(clientExecutor, todoRouter); // CSR
export const todoServerApi = createApi(serverExecutor, todoRouter); // SSR
```

---

## Adapter — 응답 변환

`adapter`를 사용하면 서버 응답을 클라이언트에서 쓰기 좋은 형태로 변환할 수 있습니다. `endpoint()` 헬퍼를 사용하면 `raw`의 타입이 `response` 스키마 출력 타입으로 자동 추론됩니다.

```ts
const TodoRawSchema = z.object({
  id: z.number(),
  title: z.string(),
  completed: z.boolean(),
  created_at: z.string(), // snake_case
});

const toTodoItem = (raw: z.infer<typeof TodoRawSchema>) => ({
  ...raw,
  createdAt: new Date(raw.created_at),           // camelCase 변환
  label: raw.completed ? `✓ ${raw.title}` : raw.title,
});

const getList = endpoint({
  method: 'GET',
  path: '/',
  response: z.array(TodoRawSchema),
  adapter: (raw) => raw.map(toTodoItem), // raw: z.infer<typeof TodoRawSchema>[]
});

// 반환 타입은 adapter 출력 타입으로 자동 추론됨
const todos = await todoApi.getList({}); // { id, title, completed, createdAt, label }[]
```

---

## 에러 종류

| 에러 | 발생 패키지 | 발생 조건 |
|------|------------|----------|
| `ValidationError` | `@routar/core` | `request.parse()` 또는 `response.parse()` 실패 |
| `HttpError` | `@routar/fetch` | 2xx가 아닌 HTTP 응답 |
| `AxiosError` | axios | axios transport 에러 (원본 그대로 전달) |

```ts
import { ValidationError } from '@routar/core';
import { HttpError } from '@routar/fetch';

try {
  await todoApi.create({ body: { title: '' } });
} catch (err) {
  if (err instanceof ValidationError) {
    // request 또는 response 파싱 실패
    console.log(err.message); // "Request validation failed"
    console.log(err.cause);   // 원본 Zod 에러
  }
  if (err instanceof HttpError) {
    // fetch executor에서 2xx 아닌 응답
    console.log(err.status);  // 400
  }
}
```

---

## 커스텀 Executor 구현

`Executor` 인터페이스를 구현하면 어떤 HTTP 클라이언트도 사용할 수 있습니다.

```ts
import type { Executor, ExecuteOptions } from '@routar/core';
import { createExecutor } from '@routar/core';

// 직접 구현
const myExecutor: Executor = {
  async execute({ method, url, body, headers, signal }) {
    const res = await myHttpClient.request({ method, url, body, headers, signal });
    return res.data;
  },
};

// createExecutor로 미들웨어 지원 추가
const myExecutor = createExecutor(
  async ({ method, url, body, headers, signal }) => {
    const res = await myHttpClient.request({ method, url, body, headers, signal });
    return res.data;
  },
  [withTimeout(5000), withRetry(2)],
);
```

---

## 타입 유틸리티

### `ApiTypes<TApi>`

API 클라이언트에서 각 엔드포인트의 request/response 타입을 추출합니다.

```ts
import type { ApiTypes } from '@routar/core';

type TodoApiTypes = ApiTypes<typeof todoApi>;

type GetDetailRequest  = TodoApiTypes['getDetail']['request'];
// { path: { id: number } }

type GetDetailResponse = TodoApiTypes['getDetail']['response'];
// { id: number, title: string, completed: boolean }
```

### `PathParams<TPath>`

경로 문자열에서 파라미터 이름을 유니온 타입으로 추출합니다.

```ts
import type { PathParams } from '@routar/core';

type P = PathParams<'/:userId/posts/:postId'>; // 'userId' | 'postId'
```

### `InferResponse<TSpec>`

`EndpointSpec`에서 최종 응답 타입을 추출합니다. adapter가 있으면 adapter 출력 타입, 없으면 response 스키마 출력 타입입니다.

```ts
import type { InferResponse } from '@routar/core';

type Response = InferResponse<typeof getDetail>; // adapter 있으면 adapter 반환 타입
```

---

## 전체 예시

```ts
import { z } from 'zod';
import { endpoint, defineRouter, createApi, withRetry, withTimeout, withLogger } from '@routar/core';
import { createFetchExecutor, HttpError } from '@routar/fetch';
import type { ApiTypes } from '@routar/core';

// ── 스키마 ──────────────────────────────────────────────────────────────────

const PostSchema = z.object({
  id:        z.number(),
  userId:    z.number(),
  title:     z.string(),
  body:      z.string(),
});

const toPost = (raw: z.infer<typeof PostSchema>) => ({
  ...raw,
  excerpt: raw.body.slice(0, 80) + '…',
});

// ── 라우터 ──────────────────────────────────────────────────────────────────

export const postRouter = defineRouter('/posts', {
  getList: endpoint({
    method: 'GET',
    path: '/',
    request: z.object({
      query: z.object({ userId: z.number().optional() }).optional(),
    }),
    response: z.array(PostSchema),
    adapter: (raw) => raw.map(toPost),
  }),

  getDetail: endpoint({
    method: 'GET',
    path: '/:id',
    request: z.object({ path: z.object({ id: z.number() }) }),
    response: PostSchema,
    adapter: toPost,
  }),

  create: endpoint({
    method: 'POST',
    path: '/',
    request: z.object({
      body: z.object({ userId: z.number(), title: z.string(), body: z.string() }),
    }),
    response: PostSchema,
    adapter: toPost,
  }),

  update: endpoint({
    method: 'PATCH',
    path: '/:id',
    request: z.object({
      path: z.object({ id: z.number() }),
      body: z.object({ title: z.string().optional(), body: z.string().optional() }),
    }),
    response: PostSchema,
    adapter: toPost,
  }),

  remove: endpoint({
    method: 'DELETE',
    path: '/:id',
    request: z.object({ path: z.object({ id: z.number() }) }),
    response: z.unknown(),
  }),
});

// ── Executor ────────────────────────────────────────────────────────────────

const executor = createFetchExecutor('https://jsonplaceholder.typicode.com', {
  middlewares: [
    withTimeout(8_000),
    withRetry(2, {
      shouldRetry: (err) => !(err instanceof HttpError && err.status < 500),
    }),
    withLogger(),
  ],
});

// ── API 클라이언트 ──────────────────────────────────────────────────────────

export const postApi = createApi(executor, postRouter);

// ── 타입 추출 ───────────────────────────────────────────────────────────────

export type PostApiTypes = ApiTypes<typeof postApi>;
export type Post = PostApiTypes['getDetail']['response'];

// ── 사용 ────────────────────────────────────────────────────────────────────

const posts  = await postApi.getList({ query: { userId: 1 } });  // Post[]
const post   = await postApi.getDetail({ path: { id: 1 } });     // Post
const created = await postApi.create({
  body: { userId: 1, title: '새 글', body: '본문' },
});
await postApi.remove({ path: { id: 1 } });
```
