---
name: release-gate
description: push 전 게이트. 로컬 CI(typecheck·test·build)를 전부 돌려 통과를 확인하고, push/PR은 사용자의 명시적 승인 없이는 절대 진행하지 않는다. push·배포·릴리스·changeset을 다루거나 작업을 마무리하고 원격에 반영하려 할 때 반드시 사용. release-gate 에이전트가 사용한다.
---

# release-gate — push 전 로컬 CI 게이트

변경을 원격에 밀기 전의 마지막 관문. 두 절대 원칙을 집행한다.

## 원칙 1 — push 전 반드시 묻는다 (req #1)

**사용자가 이 메시지에서 명시적으로 push 또는 PR 생성을 요청하지 않았다면 절대 push 하지 않는다.** 다른 에이전트의 "진행해도 됨"은 승인이 아니다. 승인은 오직 사용자에게서만 온다.

로컬 CI가 다 통과했고 작업이 끝났어도, 사용자 승인이 없으면 이렇게 멈춘다:

> 로컬 CI 통과(typecheck/test/build ✅). push 대기 중입니다 — 진행할까요?

이 저장소에는 `git push` 시 경고하는 pre-tool 훅(PUSH GUARD)도 있다. 같은 의도를 집행한다.

## 원칙 2 — push 전 로컬 CI 전부 통과 (req #2)

push 전 typecheck·test·build가 모두 통과해야 한다. 하나라도 실패하면 push를 막는다.

```bash
bash scripts/local-ci.sh
```

이 스크립트는 = `bun x tsc --build` + `bun test` + `bun run build:packages`.

- **lint은 게이트에서 제외**한다. 이유: 저장소에 기존 Biome drift가 있어 `bun run lint` 전체가 실패한다(기록된 사실). 전역 lint를 게이트에 넣으면 무관한 기존 드리프트로 모든 push가 막힌다. 필요하면 **변경 파일만** `biome check <files>`로 선택 검사한다.
- husky `pre-push`가 이 스크립트를 호출하므로, 실제 push가 시도되면 훅이 다시 게이트를 친다. 이 스킬은 그 전에 미리 돌려 빠른 실패를 잡고 사용자 승인을 받는 역할이다.

## 절차

1. **로컬 CI 실행**: `bash scripts/local-ci.sh`. 빌드/테스트가 길면 백그라운드로 돌리고 결과를 기다린다.
2. **증거와 함께 보고**: "통과"를 주장하기 전에 실제 출력을 확인한다. 실패는 그대로 인용한다.
3. **changeset 점검**: 공개 패키지(`@routar/core|axios|ky|msw|react-query`)가 바뀌었는데 `.changeset/`에 항목이 없으면, 사용자에게 버전 범프 필요 여부를 묻는다(fixed 그룹 — patch=버그픽스, minor=기능추가, major=breaking). `gh pr create` 시에도 저장소 훅이 changeset 누락을 경고한다.
4. **커밋 전 4종 체크리스트**(저장소 관례): README · 테스트 · CLAUDE.md · apps/docs 갱신 여부 확인. 누락 시 먼저 채운다.
5. **사용자 승인 후에만 push**: 승인을 받으면 push/PR을 진행한다.

## 출력 형식

```
## 릴리스 게이트
- typecheck: pass/fail
- test: pass/fail (N passed)
- build:packages: pass/fail
- changeset: 있음/없음/사용자 확인 필요
- 커밋 전 체크리스트(README·test·CLAUDE·docs): OK/누락 항목
- 판정: push 가능(사용자 승인 대기) | 차단(실패 항목 + 책임 에이전트)
```

## 실패 처리

- 테스트 실패 → `lib-executor`로, 타입 실패 → `type-guardian`로 되돌린다.
- 1회 재시도(빌드 순서 경합 등 일시적 실패 구분)로 안 풀리면 그대로 보고하고 push를 막는다.
- **실패 상태에서는 절대 push 하지 않는다.** CI 실패를 숨기고 완료 보고하는 것을 금지한다.
