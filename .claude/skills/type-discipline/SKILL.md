---
name: type-discipline
description: routar 라이브러리의 타입 작성 규율. any/unknown/never를 설계 의도 없이 쓰지 않고, 깊은 추론으로 정확한 타입을 작성하며, 불가피한 예외는 사유 코멘트로 남긴다. TypeScript 타입을 쓰거나 검수할 때, 타입 시그니처·제네릭·추론을 다룰 때 반드시 적용. lib-executor와 type-guardian이 공유한다.
---

# type-discipline — 타입 규율

routar는 codegen 없이 깊은 타입 추론만으로 완전한 타입 안전성을 제공하는 라이브러리다. 타입의 정확성이 곧 제품의 가치다. 이 스킬은 타입을 쓰거나 검수할 때의 규율을 정의한다.

## 핵심 원칙 (req #7)

**`any` / `unknown` / `never`는 설계적 의도가 있을 때만 쓴다.** 그 외에는 깊이 추론하여 정확한 타입을 작성한다.

왜 이게 중요한가: 이 라이브러리의 사용자는 타입 추론에 의존해 IDE 자동완성과 컴파일 타임 안전성을 얻는다. 어딘가에서 `any`가 새면 그 지점부터 추론이 무너지고, 사용자는 런타임에야 오류를 만난다. `any` 하나가 다운스트림 전체의 타입 안전성을 조용히 깬다.

## 회피와 예외

| 구문 | 기본 | 예외 (사유 코멘트 필수) |
|------|------|------------------------|
| `any` | 금지 | 타입 중복을 강제로 피하거나, contravariance로 제네릭 할당이 막힐 때 (예: `RouterEndpoints`) |
| `unknown` | 경계(외부 입력)에서만 | 파싱 직전 raw 값 등 — 즉시 좁힐 것 |
| `never` | 의도된 exhaustiveness check에만 | 분기 소거가 **의도**일 때만 |
| `as` 단언 | 금지 | 추론이 구조적으로 불가능할 때, 왜 안전한지 코멘트 |
| `@ts-ignore` / `@ts-expect-error` | 금지 | 외부 타입 버그 회피 등, 사유와 함께 |

**예외를 쓸 때의 형식:**

```ts
// any: AxiosInstance가 callable이라 factory와 typeof로 구분 불가 — duck-typing 위해 불가피
function isInstance(input: AxiosInstance | Factory): input is AxiosInstance { ... }
```

사유 코멘트는 "무엇을" 회피했고 "왜" 정확한 타입이 불가능한지를 한 줄로 담는다.

## 깊은 추론을 우선하는 법

- **제네릭으로 흘려보낸다**: 구체 타입을 `any`로 뭉개는 대신 제네릭 파라미터로 전파해 호출부에서 좁혀지게 한다.
- **template literal / conditional type 활용**: routar는 `PathParams<TPath>`로 `:param`을 컴파일 타임에 강제한다. 이런 패턴을 따라 문자열/구조에서 타입을 끌어낸다.
- **반환 타입에 `| undefined`를 흘리지 않는다**: `endpoint()`의 `request`/`adapter`가 `| undefined`면 `createApi`의 조건부 추론이 깨진다(CLAUDE.md). 선택 필드는 오버로드나 기본값으로 처리한다.
- **`response`는 `ZodObject`로 유지**: 변환이 필요하면 `.transform()`이 아니라 별도 `adapter` 함수로 분리한다. 합성 가능성을 지키기 위함이다.

## 유지보수성 예외 (req #7 단서)

타입을 정확히 쓰려다 **동일 타입을 여러 곳에 중복 선언**하게 되거나, **의존성 그래프가 심하게 복잡해져 유지보수성을 해칠** 것으로 판단되면, 단순화한 타입을 쓰되 **그 트레이드오프를 코멘트로 남긴다**:

```ts
// 정확 타입은 7개 제네릭을 전파해야 해 유지보수성 저하 — 호출부 추론은 유지되므로 여기선 단순화
type Simplified = ...
```

## 검수 시 (type-guardian)

각 `any/unknown/never/as/@ts-*`에 대해 묻는다: **의도인가? 사유 코멘트가 있는가? 정확한 타입으로 교체 가능한가?** 셋 중 하나라도 "정당화 안 됨"이면 Blocker로 반려한다. 그리고 `bun x tsc --build`로 컴파일 0 에러를 확인한다 — 타입 규율은 사람 눈과 컴파일러 둘 다로 검증한다.

## 기존 의도된 예외 (깨지 말 것)

- `RouterEndpoints = Record<string, EndpointSpec<any, any, any> | RouterDef<any>>` — `any`는 contravariance 회피용 **의도**. "고치지" 말 것.
- executor 판별의 duck-typing `any` — callable 타입 구분 불가로 불가피.

이들은 이미 CLAUDE.md에 근거가 있다. 새로 `any`를 추가할 때만 이 스킬의 회피 규율을 적용한다.
