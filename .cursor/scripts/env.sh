# Source from other .cursor/scripts/*.sh — do not run directly.
# Cursor sandbox shells often start with a stripped PATH; basic tools vanish.
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin:${PATH:-}"

if command -v git >/dev/null 2>&1; then
  GIT_BIN="$(command -v git)"
elif [[ -x /usr/local/bin/git ]]; then
  GIT_BIN=/usr/local/bin/git
elif [[ -x /usr/bin/git ]]; then
  GIT_BIN=/usr/bin/git
else
  echo "git not found (checked PATH, /usr/local/bin/git, /usr/bin/git)" >&2
  exit 127
fi
