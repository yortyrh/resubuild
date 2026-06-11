## Why

OpenCode command names in `.opencode/commands/*.md` frontmatter used a leading `/` (e.g., `name: /opsx-apply`). This was inconsistent with the convention used by other commands in the repo and the way opencode references commands internally (without the leading slash).

## What Changes

- Remove leading `/` from `name:` field in 12 `.opencode/commands/*.md` files.
- Files affected: `opsx-apply.md`, `opsx-archive.md`, `opsx-explore.md`, `opsx-launch-parallel.md`, `opsx-parallel-cleanup.md`, `opsx-parallel-integrate.md`, `opsx-parallel-status.md`, `opsx-plan-parallel.md`, `opsx-propose.md`, `opsx-retroactive-commit.md`, `railway-deploy.md`, `setup-prod-env.md`.

## Capabilities

### Modified Capabilities

- None — this change only touches OpenCode command metadata and does not affect any application capabilities documented in `openspec/specs/`.

## Impact

- `.opencode/commands/*.md`: 12 files updated to remove leading `/` from `name:` field.
- E2E: None — UI-only change to command metadata.
