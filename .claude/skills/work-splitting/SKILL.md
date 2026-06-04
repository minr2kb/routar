---
name: work-splitting
description: routar 작업을 어떻게 분할할지 결정. 작으면 subagent로, 피쳐 단위면 git worktree + Superset 터미널 워크스페이스로 분리해 각 워크스페이스에서 claude를 직접 실행한다. 작업 착수 전 규모 판단·병렬 분리·워크스페이스 생성이 필요할 때 반드시 사용.
---

# work-splitting — 작업 분할 (subagent vs Superset 워크스페이스)

routar 작업을 착수하기 전, 규모에 맞는 분할 방식을 고른다. 잘못된 분할은 비용을 키운다 — 작은 일에 워크스페이스를 새로 띄우면 과하고, 큰 피쳐를 한 컨텍스트에 욱여넣으면 품질이 떨어진다.

## 결정 규칙 (req #3)

| 작업 신호 | 방식 |
|----------|------|
| 버그픽스, 문서 한 줄, 테스트 추가, 단일 함수, 1~3 파일 국소 변경 | **subagent** — 현재 워크스페이스에서 `lib-executor` 등을 `Agent` 도구로 호출 |
| 단일 패키지 내 중간 규모 변경 | **subagent** (필요시 `run_in_background` 병렬) |
| 피쳐 단위: 새 executor 패키지, 미들웨어/플러그인 시스템, cross-package 리팩터, 새 패키지 | **Superset 워크스페이스 분리** |
| 서로 독립적인 2개 이상 피쳐 동시 진행 | **피쳐마다 Superset 워크스페이스 1개** (각자 git worktree + 터미널) |

핵심 직관: **"이 작업에 별도 브랜치/PR이 필요한가?"** 그렇다면 피쳐 단위 → 워크스페이스. 현재 작업에 곁들여 끝나면 → subagent.

## subagent 경로

현재 워크스페이스 안에서 `Agent` 도구로 `lib-executor`/`type-guardian` 등을 호출한다. 독립 작업이 2개 이상이면 `run_in_background: true`로 병렬화한다. 모든 Agent 호출에 `model: "opus"`를 명시한다. 결과는 메인으로 반환되어 오케스트레이터가 종합한다.

## Superset 워크스페이스 경로 (피쳐 단위)

이 저장소는 Superset(superset.sh)으로 관리된다. Superset 워크스페이스는 **git worktree + 독립 터미널**을 한 번에 만들고, 그 안에서 에이전트를 직접 띄운다. 사용자의 작업 방식과 일치한다 — 백그라운드 subagent 대신 **각 워크스페이스에서 claude를 직접 실행**한다.

### 환경 확인

현재 세션은 이미 Superset 워크스페이스 안일 수 있다. 환경변수로 확인한다:

```bash
echo "$SUPERSET_WORKSPACE_ID"   # 비어있지 않으면 Superset 워크스페이스 안
echo "$SUPERSET_ROOT_PATH"      # 프로젝트 루트
```

### 워크스페이스 생성

routar의 Superset project id는 `c386349b-2697-4bda-ac5c-f70684a91296`다(확인: `superset projects list --json`).

```bash
# 피쳐 브랜치 + 워크스페이스 + claude 에이전트를 한 번에 생성
superset workspaces create \
  --local \
  --project c386349b-2697-4bda-ac5c-f70684a91296 \
  --name "feat-<피쳐명>" \
  --branch "feat/<피쳐명>" \
  --base-branch main \
  --agent claude \
  --prompt "<해당 피쳐의 작업 지시. routar-harness 하네스를 따르라고 명시>"
```

- `--branch`가 없으면 `--base-branch`(기본 main)에서 분기해 새로 만든다.
- `--agent claude --prompt "..."`로 워크스페이스 생성 직후 claude가 그 프롬프트로 시작한다. 프롬프트에 "이 저장소의 routar-harness 하네스를 따르라"를 포함해, 분리된 워크스페이스의 claude도 같은 규율로 일하게 한다.
- 여러 피쳐는 위 명령을 피쳐 수만큼 반복한다.
- 결과(워크스페이스 ID 등)는 `--json`으로 받는다(agent 환경에서는 자동 on).

### 데스크톱에서 열기 (선택)

```bash
superset workspaces open <workspace-id>   # 데스크톱 앱에서 해당 워크스페이스 포커스
superset workspaces list                  # 활성 워크스페이스 확인
```

### 정리

피쳐가 머지되면 워크스페이스를 정리한다:

```bash
superset workspaces delete <workspace-id>
```

## 분할 후 각 경로의 책임

- **subagent**: 오케스트레이터가 결과를 모아 다음 단계(타입검수→전파→동기화→게이트)로 잇는다.
- **Superset 워크스페이스**: 각 워크스페이스가 자체적으로 전체 하네스 파이프라인을 돈다(독립 PR). 메인 세션은 사용자에게 "워크스페이스 N개 생성됨, 각자 진행 중"을 알린다.

## 주의

- Superset 워크스페이스 생성은 실재하는 git worktree와 프로세스를 만든다 — 되돌리기 번거로운 행위다. 피쳐 단위가 확실할 때만 만들고, 사용자에게 무엇을 만들지 먼저 알린다.
- `superset workspaces create`는 외부 상태(원격 host, 브랜치)를 바꿀 수 있으므로, 다수 생성 전 사용자 확인을 받는다.
