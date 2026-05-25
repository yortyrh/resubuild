#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ROOT_WORKTREE_PATH:-}" ]]; then
  echo "ROOT_WORKTREE_PATH is not set" >&2
  exit 1
fi

pnpm install --prefer-offline --frozen-lockfile || pnpm install --prefer-offline

for rel in apps/api/.env apps/web/.env; do
  src="$ROOT_WORKTREE_PATH/$rel"
  if [[ -f "$src" ]]; then
    mkdir -p "$(dirname "$rel")"
    cp "$src" "$rel"
    echo "Copied $rel from main worktree"
  else
    echo "Skip $rel (not found in main worktree)" >&2
  fi
done
