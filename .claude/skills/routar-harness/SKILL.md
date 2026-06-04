---
name: routar-harness
description: routar 라이브러리 개발 오케스트레이터. @routar/* 패키지의 기능 추가·버그픽스·리팩터·API 변경·문서/예제 전파·릴리스를 조율한다. routar 패키지 코드, 타입, executor, 미들웨어/플러그인, apps/docs 문서, apps/example 예제 작업을 요청하거나, 작업을 다시/이어서/부분 수정·재실행·업데이트·보완하려 할 때 반드시 사용. 단순 질문은 직접 응답 가능.
---

# routar-harness — 라이브러리 개발 오케스트레이터

`@routar/*` 모노레포(schema-first HTTP API client 라이브러리)의 작업을 처음부터 릴리스 직전까지 조율하는 오케스트레이터다. 누가(에이전트) 언제 어떤 순서로 협업하는지를 정의한다.

**파이프라인:** 설계 → (작업분할) → 구현 → 타입검수 → 문서/예제 전파 → 문서 동기화 → 릴리스 게이트

**실행 모드: 하이브리드.** 인-워크스페이스 단계는 subagent 파이프라인으로, 피쳐 단위 병렬 작업은 Superset 워크스페이스 분리로 처리한다(Phase 2 참조). 모든 `Agent` 호출에 `model: "opus"`를 명시한다.

## 에이전트 & 스킬 맵

| 에이전트 | 역할 | 스킬 |
|---------|------|------|
| `lib-planner` | 설계·작업분할 판단 | `work-splitting` |
| `lib-executor` | 패키지 코드 구현+테스트 | `type-discipline` |
| `type-guardian` | 타입 규율 검수 (general-purpose) | `type-discipline` |
| `docs-propagator` | docs/ 로그 + apps/docs·apps/example 전파 | `doc-propagation` |
| `doc-syncer` | llms.txt·AGENTS·CLAUDE·README 동기화 | `doc-sync` |
| `release-gate` | 로컬 CI + push 승인 게이트 (general-purpose) | `release-gate` |

## Phase 0: 컨텍스트 확인 (초기/후속/부분 판별)

워크플로우 시작 시 기존 산출물로 실행 모드를 정한다:

- `docs/_workspace/` 존재 + 사용자가 **부분 수정** 요청 → **부분 재실행**(해당 에이전트만 재호출).
- `docs/_workspace/` 존재 + **새 입력** → **새 실행**(기존 `_workspace/`는 `_workspace_prev/`로 이동).
- `docs/_workspace/` 미존재 → **초기 실행**.

요청이 단순 질문(개념·사용법)이면 하네스를 돌리지 말고 직접 답한다.

## Phase 1: 설계 & 작업 분할

1. `lib-planner`(opus)를 호출해 설계 문서를 받는다 — 영향 패키지, 공개 API/타입 변경 여부, changeset 등급, 작업 분할 판단, 타입 전략, 단계, 전파 대상.
2. 설계의 **작업 분할 판단**에 따라 분기(`work-splitting` 스킬 기준):
   - **작음(subagent)** → Phase 2-A로.
   - **피쳐 단위(Superset 워크스페이스)** → Phase 2-B로.

## Phase 2-A: 인-워크스페이스 구현 (subagent 파이프라인)

현재 워크스페이스에서 순차/병렬로 진행한다. 데이터는 반환값 + `docs/_workspace/` 파일로 전달한다.

1. **구현** — `lib-executor`(opus)에게 설계 단계를 넘긴다. 독립 단계가 2개 이상이면 `run_in_background: true`로 병렬.
2. **타입 검수** — `type-guardian`(opus, general-purpose)이 별도 패스로 검수. Blocker면 `lib-executor`로 반려, 통과까지 반복. **작성-검수 분리 원칙**: 구현한 에이전트가 자기 코드를 self-approve 하지 않는다.
3. **전파 게이트** — 설계에서 "공개 API/타입 변경 = yes"면 Phase 3로. 아니면(내부 변경만) Phase 3의 작업 로그 갱신만 수행하고 Phase 4로.

## Phase 2-B: 피쳐 단위 (Superset 워크스페이스 분리)

`work-splitting` 스킬의 절차로 피쳐마다 Superset 워크스페이스를 만든다. 각 워크스페이스는 자체 claude가 이 하네스를 독립적으로 돈다(독립 브랜치/PR).

1. 사용자에게 무엇을(피쳐 N개, 브랜치명) 만들지 먼저 알린다.
2. `superset workspaces create ... --agent claude --prompt "<피쳐 지시 + 이 저장소의 routar-harness 하네스를 따르라>"`를 피쳐 수만큼 실행.
3. 메인 세션은 생성 결과를 사용자에게 보고하고, 각 워크스페이스가 독립 진행함을 알린다. 메인에서는 더 이상 그 피쳐를 직접 구현하지 않는다.

## Phase 3: 문서 & 예제 전파 (공개 스펙 변경 시)

1. **작업 로그 (req #4)** — `docs-propagator`(opus)가 `docs/worklog/<날짜>-<주제>.md`에 작업 내용을 기록. **이 단계는 공개 스펙 변경이 없어도 항상 수행**한다(모든 작업은 docs/에 상시 기록).
2. **컨텐츠/예제 전파 (req #5)** — 공개 스펙이 바뀌었으면 `docs-propagator`가 `apps/docs/content/{en,ko}/`와 `apps/example/`을 갱신. 실제 시그니처와 문서 스니펫을 교차 비교.
3. `apps/docs/content`가 바뀌었으면 → Phase 4 트리거.

## Phase 4: 문서 동기화 (apps/docs 변경 시) — req #6

`apps/docs/content`가 바뀌었으면 `doc-syncer`(opus)가 llms.txt · llms-full.txt · AGENTS.md · CLAUDE.md · README.md · README.ko.md를 일관되게 동기화한다. (content 변경이 없으면 이 Phase는 건너뛴다.)

## Phase 5: 릴리스 게이트 — req #1, #2

`release-gate`(opus, general-purpose)가:

1. `bash scripts/local-ci.sh`(typecheck+test+build) 실행, 증거와 함께 보고.
2. 공개 패키지 변경 시 changeset 점검(없으면 사용자에게 버전 범프 질의).
3. 커밋 전 4종 체크리스트(README·test·CLAUDE.md·apps/docs) 확인.
4. **push는 사용자 명시 승인 없이는 절대 안 함.** 통과해도 "push 진행할까요?"로 멈춘다.

## 데이터 전달 프로토콜

- **반환값 기반**(subagent 결과 수집) + **파일 기반**(`docs/_workspace/` 중간 산출물, `docs/worklog/` 최종 기록).
- 파일명 컨벤션: `docs/_workspace/<YYYY-MM-DD>_<agent>_<artifact>.md` (예: `2026-06-03_lib-planner_plan.md`).
- 최종 작업 로그만 `docs/worklog/`로 승격, 중간 `_workspace/`는 보존(감사 추적).

## 에러 핸들링

- **1회 재시도 후 재실패 → 그 단계 없이 진행하지 말고 사용자에게 보고**(라이브러리 품질은 타협 불가). 타입/테스트 실패는 통과까지 반복.
- 전파 누락·상충은 삭제하지 말고 출처 병기 보고.
- 어느 단계든 실패를 숨기고 다음으로 넘어가지 않는다. 특히 release-gate는 실패 시 push 차단.

## 후속 작업 지원

이 description은 "다시/이어서/부분 수정·재실행·업데이트·보완"을 포함한다. 후속 요청 시 Phase 0으로 컨텍스트를 판별해 필요한 에이전트만 재호출한다. 각 에이전트는 이전 산출물이 있으면 읽고 해당 부분만 갱신한다(에이전트 정의의 "재호출 지침" 참조).

## 테스트 시나리오

**정상 흐름 (공개 API 변경):**
"`createFetchExecutor`에 `retries` 옵션 추가해줘"
→ Phase 0(초기) → `lib-planner` 설계(core 변경, 공개 API=yes, minor) → 작음=subagent → `lib-executor` 구현+테스트 → `type-guardian` 검수(retries 타입 정확성, any 없음) → `docs-propagator`(worklog 기록 + `executors/fetch.mdx` en/ko + `apps/example` 예제) → `doc-syncer`(llms.txt·AGENTS·README 동기화) → `release-gate`(로컬 CI 통과, minor changeset 확인, "push 할까요?"로 정지).

**에러 흐름 (타입 Blocker):**
구현이 `request: any`를 도입 → `type-guardian`이 Blocker(사유 없는 any)로 반려 → `lib-executor`가 제네릭으로 정확 타입화 → 재검수 통과 → 파이프라인 계속. tsc 실패가 1회 재시도로 안 풀리면 사용자에게 보고하고 정지.

**피쳐 흐름:**
"axios·ky executor에 동시에 새 인터셉터 시스템 추가" → `lib-planner`가 피쳐 단위·독립 2개로 판단 → `work-splitting`으로 워크스페이스 2개(`feat/axios-interceptors`, `feat/ky-interceptors`) 생성, 각자 claude가 하네스 독립 수행 → 메인은 생성 보고.
