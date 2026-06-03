#!/usr/bin/env bash
# Generate apps/api/.env and apps/web/.env from a running local Supabase stack.
# Requires: supabase CLI, `supabase start` already running.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

API_ENV="$REPO_ROOT/apps/api/.env"
WEB_ENV="$REPO_ROOT/apps/web/.env"
CONFIG_TOML="$REPO_ROOT/supabase/config.toml"

PORT="${PORT:-3001}"
WEB_ORIGIN="${WEB_ORIGIN:-http://localhost:3000}"
API_PUBLIC_URL="${API_PUBLIC_URL:-http://localhost:${PORT}}"

usage() {
  cat <<'EOF'
Usage: setup-local-env.sh [options]

Write local dev .env files using `supabase status -o env`.

Options:
  --dry-run          Print files to stdout instead of writing
  --non-interactive  Skip interactive prompts
  -h, --help         Show this help

Environment overrides (optional):
  PORT              Nest API port (default: 3001)
  WEB_ORIGIN        CORS / app origin (default: http://localhost:3000)
  API_PUBLIC_URL    PUBLIC_API_URL / NEXT_PUBLIC_API_URL (default: http://localhost:$PORT)
  MEDIA_BUCKET      Storage bucket name (default: [storage.buckets.media] in config.toml, else "media")
  MCP_EXPORT_BUCKET MCP exports bucket name (default: [storage.buckets.mcp-exports] in config.toml, else "mcp-exports")
EOF
}

dry_run=false
non_interactive=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) dry_run=true; shift ;;
    --non-interactive) non_interactive=true; shift ;;
    -h | --help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

read_env_var() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 1
  grep -E "^${key}=" "$file" 2>/dev/null | tail -1 | sed -E "s/^${key}=//"
}

is_placeholder_encryption_key() {
  local val="$1"
  [[ -z "$val" || "$val" == "change-me-to-a-long-random-secret" ]]
}

generate_encryption_key() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32
  else
    head -c 32 /dev/urandom | base64 | tr -d '\n'
  fi
}

if ! command -v supabase >/dev/null 2>&1; then
  echo "error: supabase CLI not found (https://supabase.com/docs/guides/cli)" >&2
  exit 1
fi

cd "$REPO_ROOT"

if ! supabase status -o env >/dev/null 2>&1; then
  echo "error: failed to read Supabase status — is \`supabase start\` running?" >&2
  exit 1
fi

# stderr may include "Stopped services: ..." — only eval stdout KEY="value" lines.
status_env="$(supabase status -o env 2>/dev/null)"

# shellcheck disable=SC1090
eval "$status_env"

for var in API_URL ANON_KEY SERVICE_ROLE_KEY JWT_SECRET; do
  if [[ -z "${!var:-}" ]]; then
    echo "error: supabase status did not provide $var" >&2
    exit 1
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# Storage bucket helpers (run after `supabase status` has populated API_URL /
# SERVICE_ROLE_KEY). config.toml is the single source of truth: each declared
# bucket is provisioned with its declared file_size_limit and
# allowed_mime_types via the storage management API. The `supabase storage
# create` CLI does not accept MIME allowlists, so we call the API directly.
# ─────────────────────────────────────────────────────────────────────────────

# Pull a single bucket's name out of config.toml. Returns empty string if the
# bucket is not declared, so the caller can apply its fallback.
parse_bucket_from_config() {
  local target="$1"
  [[ -f "$CONFIG_TOML" ]] || return 1
  awk -v target="$target" '
    /^\[storage\.buckets\./ {
      name = $0
      sub(/^\[storage\.buckets\./, "", name)
      sub(/\]$/, "", name)
      if (name == target) { found = 1; exit }
    }
    END { if (found) print name }
  ' "$CONFIG_TOML"
}

# Translate a TOML file_size_limit like "10MiB" or "5242880" into bytes.
toml_size_to_bytes() {
  local raw="$1"
  if [[ -z "$raw" ]]; then
    echo "10485760"
    return
  fi
  if [[ "$raw" =~ ^([0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi
  if [[ "$raw" =~ ^([0-9]+)MiB$ ]]; then
    echo $((BASH_REMATCH[1] * 1024 * 1024))
    return
  fi
  if [[ "$raw" =~ ^([0-9]+)KiB$ ]]; then
    echo $((BASH_REMATCH[1] * 1024))
    return
  fi
  if [[ "$raw" =~ ^([0-9]+)GiB$ ]]; then
    echo $((BASH_REMATCH[1] * 1024 * 1024 * 1024))
    return
  fi
  echo "10485760"
}

create_bucket_if_missing() {
  local name="$1" size_raw="$2" mimes_raw="$3"
  [[ -z "$name" ]] && return
  local size_bytes
  size_bytes="$(toml_size_to_bytes "$size_raw")"
  local mimes_json
  if [[ -n "$mimes_raw" ]]; then
    # mimes_raw is the inner text of a TOML array, e.g. `"image/png", "image/jpeg"`.
    # Use python3 to parse the quoted CSV into a JSON array. Falls back to `[]`
    # if python3 is missing or the input is malformed.
    mimes_json="$(python3 - "$mimes_raw" <<'PY' 2>/dev/null || echo '[]'
import json, sys
raw = sys.argv[1]
parts = [p.strip().strip('"').strip("'") for p in raw.split(",")]
parts = [p for p in parts if p]
print(json.dumps(parts))
PY
    )"
  else
    mimes_json="[]"
  fi
  local payload
  payload="$(printf '{"name":"%s","public":false,"file_size_limit":%s,"allowed_mime_types":%s}' "$name" "$size_bytes" "$mimes_json")"
  local http_code
  http_code="$(curl -sS -o /dev/null -w '%{http_code}' \
    -X POST "${API_URL}/storage/v1/bucket" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    --data "$payload" 2>/dev/null || echo 000)"
  case "$http_code" in
    2*) echo "  + bucket: $name (size=${size_raw:-10MiB}, mimes=${mimes_raw:-<all>})" ;;
    400|409) ;; # already exists with these settings — nothing to do
    *) echo "  ! bucket: $name (create returned HTTP $http_code, continuing)" ;;
  esac
}

# Walk every [storage.buckets.*] block in config.toml and create missing
# buckets with their declared file_size_limit + allowed_mime_types. The
# storage API returns 400/409 when the bucket already exists, which we
# treat as success — re-running this script is always safe.
provision_declared_buckets() {
  if $dry_run; then
    echo "[dry-run] would provision buckets from $CONFIG_TOML"
    return
  fi
  if [[ ! -f "$CONFIG_TOML" ]]; then
    return
  fi
  local current_name="" current_size="" current_mimes="" in_bucket=0
  while IFS= read -r line; do
    if [[ "$line" =~ ^\[storage\.buckets\.([a-zA-Z0-9_-]+)\]$ ]]; then
      [[ -n "$current_name" ]] && create_bucket_if_missing "$current_name" "$current_size" "$current_mimes"
      current_name="${BASH_REMATCH[1]}"
      current_size=""
      current_mimes=""
      in_bucket=1
      continue
    fi
    if [[ "$line" =~ ^\[ && "$in_bucket" -eq 1 ]]; then
      create_bucket_if_missing "$current_name" "$current_size" "$current_mimes"
      current_name=""
      in_bucket=0
      continue
    fi
    [[ "$in_bucket" -eq 0 ]] && continue
    if [[ "$line" =~ ^[[:space:]]*file_size_limit[[:space:]]*=[[:space:]]*\"([^\"]+)\" ]]; then
      current_size="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^[[:space:]]*allowed_mime_types[[:space:]]*=[[:space:]]*\[(.+)\] ]]; then
      current_mimes="${BASH_REMATCH[1]}"
    fi
  done <"$CONFIG_TOML"
  if [[ -n "$current_name" ]]; then
    create_bucket_if_missing "$current_name" "$current_size" "$current_mimes"
  fi
}

media_bucket="${MEDIA_BUCKET:-}"
if [[ -z "$media_bucket" && -f "$CONFIG_TOML" ]]; then
  media_bucket="$(parse_bucket_from_config media)"
fi
media_bucket="${media_bucket:-media}"

mcp_export_bucket="${MCP_EXPORT_BUCKET:-}"
if [[ -z "$mcp_export_bucket" && -f "$CONFIG_TOML" ]]; then
  mcp_export_bucket="$(parse_bucket_from_config mcp-exports)"
fi
mcp_export_bucket="${mcp_export_bucket:-mcp-exports}"

# Make sure every bucket declared in config.toml exists in the running Supabase
# with its declared file_size_limit and allowed_mime_types.
provision_declared_buckets

existing_encryption_key=""
if [[ -f "$API_ENV" ]]; then
  existing_encryption_key="$(read_env_var "$API_ENV" IMPORT_LLM_CONFIG_ENCRYPTION_KEY || true)"
  if [[ -z "$existing_encryption_key" ]]; then
    existing_encryption_key="$(read_env_var "$API_ENV" AI_AGENT_ENCRYPTION_KEY || true)"
  fi
fi

encryption_key_rotated=false
if is_placeholder_encryption_key "$existing_encryption_key"; then
  import_llm_config_encryption_key="$(generate_encryption_key)"
  if [[ -n "$existing_encryption_key" ]]; then
    encryption_key_rotated=true
  fi
else
  import_llm_config_encryption_key="$existing_encryption_key"
fi

pdf_import_max_bytes="${PDF_IMPORT_MAX_BYTES:-5242880}"
pdf_import_enabled="${PDF_IMPORT_ENABLED:-true}"

api_env_content="$(cat <<EOF
# Generated by scripts/setup-local-env.sh — re-run after \`supabase start\` / key changes.
# Source: supabase status -o env

SUPABASE_URL=${API_URL}
SUPABASE_ANON_KEY=${ANON_KEY}

# Server-only: Storage uploads (\`POST /media/upload\`)
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
MEDIA_BUCKET=${media_bucket}
MCP_EXPORT_BUCKET=${mcp_export_bucket}

# Optional legacy JWT secret — not required for API auth validation
SUPABASE_JWT_SECRET=${JWT_SECRET}

PORT=${PORT}
CORS_ORIGIN=${WEB_ORIGIN}
APP_URL=${WEB_ORIGIN}
PUBLIC_API_URL=${API_PUBLIC_URL}

# PDF import + per-user AI agent / web scrape settings (keys configured in the app UI)
AI_AGENT_ENCRYPTION_KEY=${import_llm_config_encryption_key}
PDF_IMPORT_MAX_BYTES=${pdf_import_max_bytes}
PDF_IMPORT_ENABLED=${pdf_import_enabled}
EOF
)"

web_env_content="$(cat <<EOF
# Generated by scripts/setup-local-env.sh
# Browser → Nest API over CORS (Bearer JSON). Supabase is server-side only (apps/api).

NEXT_PUBLIC_API_URL=${API_PUBLIC_URL}
EOF
)"

write_file() {
  local path="$1"
  local content="$2"
  if $dry_run; then
    printf '\n--- %s ---\n' "$path"
    printf '%s\n' "$content"
    return
  fi
  mkdir -p "$(dirname "$path")"
  printf '%s\n' "$content" >"$path"
  echo "Wrote $path"
}

write_file "$API_ENV" "$api_env_content"
write_file "$WEB_ENV" "$web_env_content"

if ! $dry_run; then
  echo "Local env ready (SUPABASE_URL=${API_URL}, MEDIA_BUCKET=${media_bucket})"
  if [[ -z "$existing_encryption_key" ]]; then
    echo "Generated IMPORT_LLM_CONFIG_ENCRYPTION_KEY for PDF import LLM settings."
  elif $encryption_key_rotated; then
    echo "Rotated AI_AGENT_ENCRYPTION_KEY — re-save AI agent and web scrape keys in settings if import fails."
  fi
  echo "Configure Tavily or Firecrawl under Dashboard → Settings → AI agent for URL import and optional web lookup."
fi
