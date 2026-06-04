---
name: doc-sync
description: apps/docs의 스펙/컨텐츠가 바뀌면 llms.txt, llms-full.txt, AGENTS.md, CLAUDE.md, README.md, README.ko.md를 모두 일관되게 동기화. apps/docs/content 변경 후, LLM/사용자 문서를 맞출 때 반드시 사용. doc-syncer 에이전트가 사용한다.
---

# doc-sync — 전 문서 표면 동기화

`apps/docs`의 스펙/컨텐츠가 바뀌면 흩어진 모든 문서 표면을 한 번에 맞춘다. routar는 "AI-친화 문서"를 표방하므로 LLM용 문서와 사람용 문서가 어긋나면 제품 신뢰가 깨진다.

## 동기화 대상 (req #6)

| 파일 | 역할 | 갱신 방식 |
|------|------|----------|
| `apps/docs/public/llms.txt` | LLM용 **요약 인덱스** (섹션 목록 + 짧은 설명 + 링크) | 수동 — content 구조 반영 |
| `apps/docs/public/llms-full.txt` | LLM용 **전체 본문** (문서 풀텍스트 통합) | 수동 — content 본문 반영 |
| `AGENTS.md` (루트) | AI 에이전트용 사용 가이드 (설치·API 요약·패턴) | 공개 API/패턴 반영 |
| `CLAUDE.md` (루트) | Claude Code용 저장소 가이드 | 아키텍처/설계 규칙 반영 (하단 하네스 포인터·변경이력 보존) |
| `README.md` (루트) | 영문 사용자 문서 | 기능/설치/예제 반영 |
| `README.ko.md` (루트) | 국문 사용자 문서 | README.md와 대응 |

**중요: llms.txt/llms-full.txt는 자동 생성 스크립트가 없다(확인됨).** 손으로 유지한다.

## 동기화 절차

1. **무엇이 바뀌었나 파악**: `docs-propagator`가 알린 `apps/docs/content` 변경(또는 직접 diff 확인).
2. **진실원천 확인**: API의 진실원천은 `packages/*/src` 코드와 `apps/docs/content`다. 아래 문서는 그것을 **반영**할 뿐 새 사실을 발명하지 않는다.
3. **6개 대상 순회**:
   - `llms.txt`: 섹션이 추가/삭제/개명됐으면 인덱스 항목과 설명을 맞춘다.
   - `llms-full.txt`: 해당 섹션 본문을 content와 일치시킨다.
   - `AGENTS.md`: 공개 API·사용 패턴·설치 명령이 바뀌었으면 반영.
   - `CLAUDE.md`: 아키텍처/파일맵/설계 규칙이 바뀌었으면 반영. **하단 "하네스" 포인터와 변경 이력 테이블은 유지**.
   - `README.md` → `README.ko.md`: 영문 갱신분을 국문에 대응 반영.
4. **일관성 검증**: 6개 문서에서 같은 API를 설명하는 부분이 서로 모순되지 않는지 교차 확인.

## 일관성 규칙

- **en ↔ ko 대응**: `README.md`에 추가한 섹션은 `README.ko.md`에도, `content/en`은 `content/ko`에도(이건 doc-propagation 단계지만 동기화 시 재확인).
- **버전/설치 명령 일치**: 패키지명·peer dependency·설치 스니펫이 모든 문서에서 동일해야 한다.
- **코드 스니펫 동작 보장**: 문서의 예제 코드는 실제 현재 API로 컴파일 가능해야 한다. 옛 시그니처가 남아있지 않은지 확인.

## 저장소 훅 인지

이 저장소에는 pre-commit 훅이 있어 `apps/docs/content/` 변경을 커밋할 때 `llms.txt`와 `AGENTS.md`가 스테이징되지 않으면 경고한다. 따라서 content를 건드린 작업은 이 두 파일을 **함께 갱신·스테이징**해야 커밋 흐름이 막히지 않는다. 이는 req #6을 강제하는 안전망이다.

## 누락/상충 처리

- 6개 대상 중 대응 위치를 못 찾으면 추측으로 채우지 말고 누락을 보고한다.
- 사람용 문서와 LLM용 문서가 상충하면 **코드/content를 기준**으로 정렬하고 차이를 보고한다.
- 기존 문서를 삭제·덮어쓰기 전에 그 내용이 설명과 다르면(직접 만든 게 아니면) 먼저 사용자에게 알린다.
