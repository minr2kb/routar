#!/usr/bin/env bash
# Local CI gate (req #2): everything that must pass before a push.
# Mirrors .github/workflows/ci.yml minus coverage upload.
# Single source of truth — invoked by .husky/pre-push and by the release-gate skill.
#
# NOTE: `bun run lint` (biome check) is intentionally NOT in this gate.
# The repo carries pre-existing Biome drift, so a full lint fails on unrelated
# legacy code and would block every push. Lint changed files manually instead:
#   biome check <changed-files>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "▶ [1/3] typecheck — tsc --build"
bun x tsc --build

echo "▶ [2/3] test — bun test"
bun test

echo "▶ [3/3] build — build:packages"
bun run build:packages

echo "✅ local CI passed (typecheck + test + build)"
