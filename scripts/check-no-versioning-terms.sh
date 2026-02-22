#!/usr/bin/env bash
set -euo pipefail

targets=(
  "AGENTS.md"
  "docs"
  "project-management"
  ".github"
  "README.md"
  "CHANGELOG.md"
)

if rg -n -i --hidden --glob '!.git' --glob '!node_modules' --glob '!.next' '\bcodex\b' "${targets[@]}"; then
  echo
  echo "Forbidden term found in governance/versioning files: codex"
  echo "Replace it before merging."
  exit 1
fi

echo "Governance/versioning terminology check passed."

