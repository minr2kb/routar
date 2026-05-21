# Changeset + GitHub 자동 릴리즈 워크플로우 설계

**날짜:** 2026-05-20  
**대상 패키지:** `@routar/core`, `@routar/fetch`, `@routar/axios`

---

## 요약

Changesets의 "Release PR" 패턴을 사용해 세 패키지를 linked(동일 버전) 방식으로 관리하고, GitHub Actions로 CI 검증 및 npm 배포·GitHub Release 생성을 자동화한다.

---

## 전체 흐름

```
feature 브랜치에서 작업
  → bun x changeset (changeset 파일 생성)
  → PR 열기
  → ci.yml: 타입체크 + 테스트 + 빌드 + changeset 존재 확인
  → main merge
  → release.yml: "Version Packages" PR 생성/업데이트
  → "Version Packages" PR merge
  → release.yml: npm publish + GitHub Release 생성
```

---

## 파일 구성

```
.changeset/
  config.json
.github/
  workflows/
    ci.yml
    release.yml
```

---

## 1. Changesets 설정 (`.changeset/config.json`)

```json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "linked": [["@routar/core", "@routar/fetch", "@routar/axios"]],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- `linked` — 세 패키지를 하나로 묶어 항상 동일 버전 유지. 어느 하나라도 changeset에 포함되면 셋 다 버전 범프
- `updateInternalDependencies: "patch"` — `@routar/fetch`, `@routar/axios`의 `peerDependencies` 버전 범위 자동 업데이트

---

## 2. CI 워크플로우 (`.github/workflows/ci.yml`)

PR to main마다 실행.

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2

      - run: bun install --frozen-lockfile
      - run: bun x tsc --build
      - run: bun test
      - run: bun run build

      - name: Check changeset exists
        if: github.actor != 'github-actions[bot]'
        run: bun x changeset status --since=origin/main
```

- changeset 체크는 Changesets bot PR(`github-actions[bot]`)에서 건너뜀 — bot PR에는 `.changeset` 파일이 없음
- `--since=origin/main` — 이번 PR에서 새로 추가된 changeset 파일 존재 여부만 확인

---

## 3. Release 워크플로우 (`.github/workflows/release.yml`)

main push마다 실행. `changesets/action`이 상황에 따라 자동 분기:

- changeset 파일 있음 → "Version Packages" PR 생성 또는 업데이트
- "Version Packages" PR merge 직후 → npm publish + GitHub Release 생성

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2

      - run: bun install --frozen-lockfile
      - run: bun run build

      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: bun x changeset publish
          createGithubReleases: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- `id-token: write` — npm provenance(패키지 출처 증명) 활성화
- `NPM_TOKEN` — GitHub repo Settings → Secrets → Actions에 추가 필요

---

## 4. 개발자 워크플로우

### feature 작업 시

```bash
# 작업 완료 후
bun x changeset

# 대화형 프롬프트:
# → 변경된 패키지 선택 (linked이므로 하나만 선택해도 세 패키지 버전 범프)
# → 변경 종류: patch | minor | major
# → 변경 내용 한 줄 설명

# 생성된 .changeset/abc123.md 파일을 커밋에 포함
git add .changeset/
git commit -m "chore: add changeset"
```

### 릴리즈 시

1. "Version Packages" PR이 자동 생성됨 (봇이 유지)
2. CHANGELOG 및 버전 변경사항 확인
3. PR merge → npm publish + GitHub Release 자동 실행

---

## 사전 준비 사항

| 항목 | 설명 |
|------|------|
| `@changesets/cli` | devDependency로 설치 |
| `NPM_TOKEN` | npmjs.com에서 Automation 토큰 발급 후 GitHub Secrets에 등록 |
| GitHub Actions 권한 | Settings → Actions → General → Workflow permissions: "Read and write permissions" 활성화 |
