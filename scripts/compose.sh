#!/usr/bin/env bash
# Runs `docker compose` (or `podman compose` when Docker is not installed)
# against docker-compose.dev.yml. Extra arguments are passed through.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.dev.yml"

if command -v docker >/dev/null 2>&1; then
  exec docker compose -f "$COMPOSE_FILE" "$@"
elif command -v podman >/dev/null 2>&1; then
  exec podman compose -f "$COMPOSE_FILE" "$@"
else
  echo "error: neither docker nor podman is installed" >&2
  exit 1
fi
