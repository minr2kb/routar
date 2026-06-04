---
name: doc-propagation
description: routar 패키지 스펙/API 변경을 docs/ 작업 로그·apps/docs 컨텐츠(en·ko)·apps/example 예제로 전파. 패키지 공개 API, 타입 시그니처, executor 동작, 미들웨어/플러그인이 바뀌었거나 새 작업 내용을 기록할 때 반드시 사용. docs-propagator 에이전트가 사용한다.
---

# doc-propagation — 스펙 전파 & 작업 로그

라이브러리에서 가장 흔한 부패는 "코드는 바뀌었는데 문서·예제는 옛날 그대로"다. 이 스킬은 변경을 다운스트림으로 빠짐없이 흘려보내는 절차를 정의한다.

## 1. 작업 로그 상시 갱신 (req #4)

모든 작업 추가 내용은 `docs/` 폴더에 상시 기록한다. 왜: 변경의 의도와 맥락은 코드 diff만으로는 복원되지 않는다. 다음 세션/다음 사람이 "왜 이렇게 했는지"를 `docs/`에서 찾을 수 있어야 한다.

> `docs/`는 **로컬 전용**이다 — 루트 `.gitignore`의 `/docs`로 무시되어 커밋·푸시되지 않는다. 자유롭게 상세히 기록하되, 공개되어야 할 내용(공개 API·사용법)은 `docs/`가 아니라 `apps/docs`·README로 전파한다(아래 2·4단계).

**위치와 형식:**

- `docs/worklog/<YYYY-MM-DD>-<주제>.md` — 작업 단위 기록. 무엇을·왜·어떤 패키지·전파 결과.
- `docs/decisions/` — 설계 결정이 바뀌면 여기에 (기존 design-decisions 관례 연장).
- 중간 산출물은 `docs/_workspace/`에 둔다(plan 등). 최종 기록만 `docs/worklog/`로 승격.

작업 로그 항목 템플릿:

```markdown
# <YYYY-MM-DD> <주제>
## 변경: <한 줄>
## 패키지: [core, react-query, ...]
## 공개 스펙 변경: yes/no
## 전파: apps/docs(en/ko) ✅ | apps/example ✅ | doc-sync 트리거 ✅/N-A
## 사유/맥락: ...
```

## 2. apps/docs 컨텐츠 전파 (req #5)

패키지 스펙/API가 바뀌면 `apps/docs/content/en/`과 `apps/docs/content/ko/`의 해당 문서를 갱신한다. **en/ko를 항상 같이** 갱신한다(한쪽만은 드리프트).

### 전파 매핑

| 변경 | apps/docs/content/{en,ko}/ |
|------|----------------------------|
| `@routar/core` `endpoint()`/`defineRouter()`/`createApi()` | `api-reference/endpoint.mdx`, `define-router.mdx`, `create-api.mdx`, `api-types.mdx` |
| `createExecutor` / 미들웨어 / 플러그인 | `api-reference/create-executor.mdx`, `middleware.mdx`, `dispatch-executor.mdx` |
| executor 추가/동작 변경 (fetch/axios/ky) | `executors/index.mdx`, `executors/{fetch,axios,ky}.mdx`, 필요시 `guides/custom-executor.mdx` |
| `@routar/react-query` | `api-reference/create-queries.mdx`, `guides/react-query.mdx`, `guides/ssr-csr.mdx` |
| `@routar/msw` | `guides/mocking.mdx` |
| 에러 처리 동작 (`HttpError`/`ValidationError`) | `guides/error-handling.mdx` |
| 시작/개요 영향 | `getting-started.mdx`, `why.mdx`, `ai-integration.mdx` |

### 교차 비교 (핵심)

"문서가 존재함"으로 끝내지 말 것. **변경된 실제 시그니처**(`packages/*/src`)와 **문서 내 코드 스니펫**을 나란히 읽어 shape이 일치하는지 비교한다. 인자 이름·옵션 키·반환 타입·import 경로까지 맞춘다.

## 3. apps/example 예제 전파 (req #5)

변경이 사용 코드에 영향을 주면 예제를 최신 동작 API로 갱신한다.

| 변경 | apps/example 위치 |
|------|-------------------|
| executor 사용법 | `remote/lib/executor.ts` |
| 서비스 정의(`defineRouter`+`endpoint`+`createApi`+`createQueries`) | `remote/services/<domain>/*.ts` |
| 쿼리/뮤테이션 훅 패턴 | `remote/services/<domain>/*.queries.ts` 또는 컴포넌트 `components/*Client.tsx` |
| Route Handler 계약(공유 Zod 스키마) | `app/api/.../*` + 해당 서비스의 `*RawSchema` |

예제는 **실제로 타입 체크/빌드되어야** 한다. 고친 뒤 깨지지 않는지 확인하고(최종 게이트는 release-gate), 깨지면 고친다.

## 4. 다음 단계 트리거 (req #6 연쇄)

`apps/docs/content`를 갱신했다면 그 변경은 LLM/사용자 문서로 더 퍼져야 한다. 반드시 `doc-sync` 스킬(=`doc-syncer` 에이전트)로 llms.txt·llms-full.txt·AGENTS.md·CLAUDE.md·README(.ko).md 동기화를 잇는다.

## 누락 처리

전파 대상 일부를 못 찾으면 추측으로 새 파일을 만들지 말고 누락으로 보고한다. 상충하는 기존 문서는 삭제하지 말고 출처를 병기해 보고한다.
