# Routar 설계 결정 기록

> 초기 설계의 문제점을 발견하고, 각각 어떻게 해결했는지 과정을 정리한 문서.

---

## 1. 초기 Executor 패턴 분석

### 구조

```
EndpointSpec (method, path, request, response, adapter)
    └─ defineRouter (prefix + endpoints)
         └─ createApi(executor, router)
              └─ typed API client { getList(), getDetail(), ... }

Executor interface { execute(ExecuteOptions): Promise<unknown> }
    ├─ createFetchExecutor(baseURL, { defaultHeaders })
    └─ createAxiosExecutor(factory: () => AxiosInstance)
```

### 장점

- **Transport 추상화**: `Executor` 인터페이스 하나로 fetch/axios 완전 교체 가능
- **End-to-end 타입 안전**: `EndpointSpec` → `InferResponse` → API client 반환 타입까지 추론
- **관심사 분리**: 요청 검증 → URL 빌드 → executor 호출 → 응답 검증 → adapter 변환이 단계별로 명확히 분리
- **테스트 친화적**: Mock executor 주입으로 HTTP 없이 단위 테스트 가능
- **SSR/CSR 이중 executor**: fetchExecutor(SSR) / clientExecutor(CSR) 패턴이 명확

### 발견한 단점

| # | 문제 |
|---|------|
| 1 | HTTP 에러 타입 불일치 — fetch는 `HttpError`, axios는 `AxiosError`를 던짐 |
| 2 | 미들웨어/인터셉터 체계 없음 — 로깅, retry, 토큰 갱신을 추가할 표준 방법이 없음 |
| 3 | per-request 헤더 전달 불가 — 엔드포인트 함수 시그니처가 `(params, signal?)`이라 요청별 커스텀 헤더를 넘길 방법이 없음 |
| 4 | adapter의 `any` cast — `adapter: (raw: any) => ...` 형태로 강제 캐스트 필요 |
| 5 | SSR/CSR 이중 선언 보일러플레이트 — 도메인마다 `todoApi` / `todoServerApi` 두 인스턴스 반복 |

---

## 2. 에러 타입 통일 전략

### 초기 제안

`HttpError`를 `@routar/core`로 올리고 axios executor에서도 동일한 타입으로 wrap하면 소비자가 `instanceof HttpError`로 처리 가능.

### 문제

`AxiosError`는 `response.data`, `response.headers`, `config` 등 fetch의 `HttpError`보다 훨씬 풍부한 정보를 담는다. 강제로 wrap하면 그 정보를 잃는다.

### 결정: 미들웨어에 위임

에러 변환은 opt-in으로 미들웨어에서 처리. 각 transport는 원본 에러를 그대로 던지고, 필요한 경우 사용자가 미들웨어로 변환.

```ts
// 필요하면 직접 작성
const withErrorNormalizer = defineMiddleware(async (opts, next) => {
  try {
    return await next(opts);
  } catch (err) {
    if (isAxiosError(err)) throw new HttpError(err.response?.status ?? 0, err.message);
    throw err;
  }
});
```

이 결정이 미들웨어 시스템 도입의 직접적인 동기가 되었다.

---

## 3. 미들웨어 시스템 설계

### 설계 결정 1: factory의 역할

`createExecutor`가 받는 `factory`를 무엇으로 볼 것인가.

- **후보 A**: `() => TClient` — 클라이언트 인스턴스를 반환하는 팩토리
- **후보 B**: `(opts: ExecuteOptions) => Promise<unknown>` — execute 함수 자체

**결정: B.** 인스턴스 생성과 요청 실행을 분리할 이유가 없고, axios/fetch 패키지가 transport 로직을 함수로 작성하는 게 더 자연스럽다.

### 설계 결정 2: 미들웨어 연결 시점

- **후보 A**: `createExecutor(execute, [mw1, mw2])` — 생성 시 선언
- **후보 B**: `composeExecutor(executor, mw1, mw2)` — 생성 후 조합

**결정: A.** 설정이 executor 생성 지점 한 곳에 모이고, 모든 transport에 일관되게 적용된다.

### 구현

```ts
export type ExecutorMiddleware = (
  options: ExecuteOptions,
  next: (options: ExecuteOptions) => Promise<unknown>,
) => Promise<unknown>;

export function createExecutor(
  execute: (options: ExecuteOptions) => Promise<unknown>,
  middlewares: ExecutorMiddleware[] = [],
): Executor {
  const chain = middlewares.reduceRight<(options: ExecuteOptions) => Promise<unknown>>(
    (next, mw) => (opts) => mw(opts, next),
    execute,
  );
  return { execute: chain };
}
```

**구현 중 이슈**: `reduceRight` 호출에서 타입 오류 발생.

```
Argument of type 'ExecutorMiddleware' is not assignable to parameter of type
'(options: ExecuteOptions) => Promise<unknown>'.
Target signature provides too few arguments.
```

`ExecutorMiddleware`는 인자가 2개인 함수이지만, accumulator가 1개짜리 함수 타입으로 추론되면서 충돌. `reduceRight`에 타입 파라미터를 명시해 해결.

```ts
// 오류
const chain = middlewares.reduceRight(
  (next, mw) => (opts: ExecuteOptions) => mw(opts, next),
  execute,
);

// 수정
const chain = middlewares.reduceRight<(options: ExecuteOptions) => Promise<unknown>>(
  (next, mw) => (opts) => mw(opts, next),
  execute,
);
```

### Built-in 미들웨어

`withRetry`, `withTimeout`, `withLogger`를 `@routar/core`에 포함. 별도 패키지로 분리하면 도입 마찰이 생기고, 세 개 정도는 core가 감당할 수준이라 판단.

`withTimeout`은 `AbortSignal`을 직접 조합해야 해서, 여러 signal을 하나로 합치는 `anySignal` 내부 헬퍼도 함께 작성.

---

## 4. DTS 빌드 오류

### 증상

```
error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
```

tsconfig에는 `baseUrl`이 없는데 에러가 난다.

### 원인

tsup이 DTS(타입 선언) 생성 시 내부적으로 `baseUrl`을 주입한다. 프로젝트가 TypeScript 6.x를 사용하고 있어 이 옵션이 deprecated로 처리됨.

### 해결

tsconfig가 아닌 tsup.config.ts의 `dts` 옵션에 `compilerOptions`를 오버라이드.

```ts
// 변경 전
dts: true,

// 변경 후
dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
```

---

## 5. Adapter 타입 추론 문제

### 증상

`adapter`에 함수를 넘길 때 `(raw: any)` 캐스트가 강제됨.

```ts
// 직접 참조 불가
adapter: toTodoItem,          // ❌

// any 캐스트 필요
const toTodoItemAny = toTodoItem as (raw: any) => ReturnType<typeof toTodoItem>;
adapter: toTodoItemAny,       // ✅

// 인라인도 any 필요
adapter: (raw: any) => raw.map(toTodoItem),  // ✅
```

### 원인 분석

`RouterEndpoints`가 다음과 같이 고정되어 있었다.

```ts
type RouterEndpoints = Record<string,
  EndpointSpec<RequestShape, Validator<unknown>, ((raw: any) => unknown) | undefined>
>;
```

`defineRouter<TEndpoints extends RouterEndpoints>`에서 타입 검사가 이 제약을 기준으로 이루어지는데, `EndpointSpec<..., Validator<unknown>, ...>`에서 `ValidatorOutput<Validator<unknown>>` = `unknown`이 된다.

따라서 adapter의 기대 타입이 `(raw: unknown) => unknown`이 된다. 함수 파라미터는 반공변(contravariant)이므로 `(raw: SpecificType) => R`은 `(raw: unknown) => R`의 서브타입이 아니다. TypeScript가 올바르게 거부하는 것.

### 해결 1단계: RouterEndpoints 완화

```ts
// 변경 전
type RouterEndpoints = Record<string, EndpointSpec<RequestShape, Validator<unknown>, (...) | undefined>>;

// 변경 후
type RouterEndpoints = Record<string, EndpointSpec<any, any, any>>;
```

`any`를 사용하면 adapter에 어떤 함수든 할당 가능해진다. 단, 타입 검사가 없어 잘못된 adapter를 잡지 못한다.

### 해결 2단계: `endpoint()` 헬퍼 — contextual typing 제공

adapter의 `raw` 파라미터 타입을 자동으로 추론시키는 헬퍼.

**1차 시도: `TSpec & { adapter: ... }` 방식**

```ts
function endpoint<TRequest, TResponse, TOut, TSpec extends { ... }>(
  spec: TSpec & { adapter: (raw: ValidatorOutput<TResponse>) => TOut }
): TSpec & { adapter: ... }
```

문제: `adapter`가 `TSpec` 안으로 흡수되어 contextual typing이 작동하지 않는다. `raw`가 `unknown`으로 추론됨.

**2차 시도: 2 overload (with/without adapter)**

```ts
function endpoint<TRequest, TResponse, TOut>(spec: {
  request?: Validator<TRequest>;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
}): { request?: Validator<TRequest>; ... adapter: FnType };

function endpoint<TRequest, TResponse>(spec: {
  request?: Validator<TRequest>;
  response: TResponse;
}): { request?: Validator<TRequest>; ... };
```

문제: 반환 타입에서 `request?:`가 optional이 되어 `TSpec['request'] = Validator<TRequest> | undefined`가 된다. `EndpointFn`에서 params 타입 계산 시:

```ts
params: TSpec['request'] extends { parse: ... } ? R : RequestShape
```

`Validator<TRequest> | undefined`가 union으로 distribute되어 결과가 `TRequest | RequestShape` = `RequestShape`로 widening. 실제 타입이 사라진다.

**최종: 4 overload**

request 유무 × adapter 유무 = 4가지 경우를 모두 별도 overload로 처리. 각 overload의 반환 타입에서 `request`와 `adapter`를 모두 required로 선언.

```ts
// request O + adapter O
function endpoint<TRequest, TResponse, TOut>(spec: {
  method: HttpMethod; path: string;
  request: Validator<TRequest>;   // required
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;  // required → contextual typing
}): { ..., request: Validator<TRequest>; adapter: FnType };  // required in return type

// request O + adapter X
function endpoint<TRequest, TResponse>(spec: {
  request: Validator<TRequest>;
  response: TResponse;
}): { request: Validator<TRequest>; response: TResponse };

// request X + adapter O
function endpoint<TResponse, TOut>(spec: {
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
}): { response: TResponse; adapter: FnType };

// request X + adapter X
function endpoint<TResponse>(spec: {
  response: TResponse;
}): { response: TResponse };

function endpoint(spec: unknown): unknown { return spec; }
```

**왜 4개가 필요한가**: 반환 타입에서 required 필드와 absent 필드를 정확히 표현해야 `TSpec['request']`와 `TSpec['adapter']`가 `| undefined` 없이 추론되기 때문이다. optional(`?:`)로 선언된 반환 타입은 항상 `| undefined`를 포함해 downstream 타입 계산을 망친다.

### 결과

```ts
// 변경 전 — any 캐스트 필요
const toTodoItemAny = toTodoItem as (raw: any) => ReturnType<typeof toTodoItem>;
adapter: toTodoItemAny,
adapter: (raw: any) => raw.map(toTodoItem),

// 변경 후 — 캐스트 없음
adapter: toTodoItem,                    // 함수 참조 직접 사용
adapter: (raw) => raw.map(toTodoItem), // raw가 정확한 타입으로 추론됨
```

### 이름 결정

처음엔 `defineEndpoint`로 구현했으나, `defineRouter` 안에서 인라인으로 쓰기에 너무 verbose하다는 판단. `endpoint`로 최종 결정.

```ts
// 최종
export const TodoRouter = defineRouter('/todos', {
  getList: endpoint({ ... }),
  getDetail: endpoint({ ... }),
});
```

---

## 6. createAxiosExecutor: factory → instance or factory

### 배경

기존 `createAxiosExecutor(factory: () => AxiosInstance)`는 항상 factory 함수를 요구했다.

```ts
// 어색한 CSR 사용
const clientExecutor = createAxiosExecutor(() => clientInstance);
```

### 변경 목표

CSR에서는 인스턴스를 직접 넘기고, SSR에서는 요청마다 동적 헤더가 필요하므로 factory를 유지.

```ts
// CSR — 간결
createAxiosExecutor(clientInstance)

// SSR — factory (동적 헤더)
createAxiosExecutor(async () => {
  const token = await getTokenFromCookies();
  return axios.create({ headers: { Authorization: `Bearer ${token}` } });
})
```

### 구현 중 이슈: AxiosInstance도 callable

`typeof === 'function'`으로 구분하려 했으나 `AxiosInstance`도 함수다(`axios.create()`가 반환하는 객체는 `(config) => AxiosPromise`처럼 호출 가능). 따라서 `typeof input === 'function'` 체크로는 factory와 인스턴스를 구분할 수 없다.

`AxiosInstance`가 factory처럼 `input()`으로 호출될 때 TypeScript가 `AxiosInstance`의 call signature(`(config: AxiosRequestConfig) => AxiosPromise`)를 적용해 "Expected 1-2 arguments, but got 0" 오류 발생.

### 해결: duck-typing으로 판별

`AxiosInstance`에만 존재하는 `interceptors` 프로퍼티로 구분.

```ts
function resolveInstance(input: InstanceOrFactory): AxiosInstance | Promise<AxiosInstance> {
  // AxiosInstance는 callable이지만 interceptors를 가짐
  // 순수 factory 함수는 interceptors가 없음
  if ('interceptors' in (input as object)) {
    return input as AxiosInstance;
  }
  return (input as InstanceFactory)();
}
```

---

## 7. 경로 파라미터 타입 강제 (PathParams)

### 문제

`path: '/:id'`와 `request: z.object({ path: z.object({ id: z.number() }) })`를 둘 다 작성해야 한다. 이 둘 사이에 아무런 연결이 없어서, path에는 `:id`가 있는데 request에 `id`를 빠뜨려도 컴파일 에러가 나지 않는다.

```ts
// ❌ 런타임에서야 발견되는 실수 — 컴파일 시점엔 에러 없음
endpoint({
  path: '/:id',
  request: z.object({ query: z.object({ filter: z.string() }) }), // path 없음
  response: TodoSchema,
})
```

### 결정: 타입 레벨 강제 (Option A)

두 가지 대안을 검토했다.

- **Option A (채택)**: template literal 타입으로 path string에서 파라미터 이름을 추출 → `request`가 있는 overload에서 `TRequest`에 제약을 건다. 런타임 변경 없이 불일치를 컴파일 타임에 잡는다.
- **Option B**: `request` 없이도 `{ path: Record<PathParams, string> }`를 자동으로 infer. 편리하지만 path param이 항상 `string`이라 Zod coercion이 필요한 경우 결국 request를 써야 함 → 실용성 제한적.

### 구현

```ts
/** '/:id/:name' → 'id' | 'name' */
export type PathParams<TPath extends string> =
  TPath extends `${string}:${infer Param}/${infer Rest}`
    ? Param | PathParams<Rest>
    : TPath extends `${string}:${infer Param}`
      ? Param
      : never;

/** path param이 있으면 request.path에 해당 키를 require */
type PathConstraint<TPath extends string> =
  [PathParams<TPath>] extends [never]
    ? {}
    : { path: Record<PathParams<TPath>, unknown> };
```

`endpoint()` overload에서 `request` 있는 케이스에만 `TRequest extends RequestShape & PathConstraint<TPath>` 제약 추가. `request` 없는 overload는 그대로.

### 결과

```ts
// ✅ 정상
endpoint({
  path: '/:id',
  request: z.object({ path: z.object({ id: z.number() }) }),
  response: TodoSchema,
})

// ❌ 컴파일 에러 — path에 ':id'가 있는데 request.path.id 없음
endpoint({
  path: '/:id',
  request: z.object({ query: z.object({ filter: z.string() }) }),
  response: TodoSchema,
})
```

TypeScript overload 특성상 에러 메시지는 last overload 기준으로 표시되어 다소 불명확할 수 있으나, 불일치 자체는 정확히 잡아준다.

---

## 8. 중첩 라우터 (Nested Router)

### 배경

도메인별로 라우터를 분리해서 관리할 때, `defineRouter` 안에 또 다른 `defineRouter`를 넣어 URL 계층과 API 클라이언트 구조를 동시에 표현하고 싶다는 요구.

### 설계 결정

**타입**: `RouterEndpoints`의 값 타입을 `EndpointSpec` 단독에서 `EndpointSpec | RouterDef`(= `RouterEntry`)로 확장.

```ts
// 변경 전
type RouterEndpoints = Record<string, EndpointSpec<any, any, any>>;

// 변경 후
type RouterEntry = EndpointSpec<any, any, any> | RouterDef<any>;
type RouterEndpoints = Record<string, RouterEntry>;
```

`ApiClient` 타입도 조건부 타입으로 값이 `RouterDef`이면 재귀적으로 중첩 클라이언트를 반환하도록 변경.

```ts
type ApiClient<TEndpoints extends RouterEndpoints> = {
  [K in keyof TEndpoints]: TEndpoints[K] extends RouterDef<infer TNestedEndpoints>
    ? ApiClient<TNestedEndpoints>
    : TEndpoints[K] extends EndpointSpec<any, any, any>
      ? EndpointFn<TEndpoints[K]>
      : never;
};
```

**런타임**: `createApi` 내부를 `buildClient` 재귀 함수로 분리. entry가 `prefix`와 `endpoints`를 가지면 `RouterDef`로 판단해 `joinPaths(prefix, nested.prefix)`로 prefix를 합치고 재귀 호출.

```ts
if ('prefix' in entry && 'endpoints' in entry) {
  client[key] = buildClient(executor, joinPaths(prefix, nested.prefix), nested.endpoints);
} else {
  // 기존 EndpointSpec 처리
}
```

### 결과

```ts
const api = createApi(executor, defineRouter('/api', {
  users: defineRouter('/users', {
    getList: endpoint({ method: 'GET', path: '/', response: UserListSchema }),
    todos: defineRouter('/todos', {
      getDetail: endpoint({ method: 'GET', path: '/:id', ... }),
    }),
  }),
}));

api.users.getList({});             // GET /api/users
api.users.todos.getDetail({ path: { id: 1 } }); // GET /api/users/todos/1
```

기존 flat 라우터와 완전히 하위 호환. prefix 합산 규칙은 기존 `joinPaths`를 그대로 재사용.

---

## 9. 미해결 / 차후 작업

### per-request 헤더

현재 엔드포인트 함수 시그니처 `(params, signal?)`에는 요청별 커스텀 헤더를 넘길 방법이 없다. 고려 중인 대안:

| 방식 | 설명 | 비고 |
|------|------|------|
| call site — options 객체 | `(params, { signal, headers })` | signal 위치가 breaking |
| endpoint 정의 — 정적 헤더 | `endpoint({ ..., headers: { 'X-Version': '2' } })` | 빌드 타임 고정값만 가능 |
| endpoint 정의 — 헤더 함수 | `endpoint({ ..., headers: (params) => ({ ... }) })` | params 접근 가능, 외부 상태 불가 |
| 미들웨어 | `defineMiddleware(...)` | 이미 가능, 특정 endpoint만 선택적 적용 어려움 |

### SSR/CSR 이중 선언 보일러플레이트

도메인마다 `todoApi` / `todoServerApi`를 각각 선언해야 하는 반복. `createDualApi(clientExecutor, fetchExecutor, router)` 같은 헬퍼로 줄일 수 있다.
