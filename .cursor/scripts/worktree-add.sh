#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

usage() {
  echo "Usage: worktree-add.sh <change-name> [base-ref]" >&2
  echo "  Creates .worktrees/<change-name> on branch opsx/<change-name>." >&2
  exit 1
}

[[ $# -ge 1 && $# -le 2 ]] || usage

name="$1"
base_ref="${2:-main}"
branch="opsx/$name"
path=".worktrees/$name"

repo_root="$("$GIT_BIN" rev-parse --show-toplevel)"
cd "$repo_root"

mkdir -p .worktrees

abs_path="$(pwd)/$path"
if "$GIT_BIN" worktree list --porcelain | awk -v want="$abs_path" '
  /^worktree / { p = $2 }
  /^branch / { b = $2 }
  /^$/ {
    if (p == want) { print p; exit 0 }
    p = ""; b = ""
  }
' | grep -qx "$abs_path"; then
  echo "REUSE: $path"
  "$GIT_BIN" worktree list
  exit 0
fi

if "$GIT_BIN" show-ref --verify --quiet "refs/heads/$branch"; then
  "$GIT_BIN" worktree add "$path" "$branch"
else
  "$GIT_BIN" worktree add -b "$branch" "$path" "$base_ref"
fi

"$GIT_BIN" worktree list
