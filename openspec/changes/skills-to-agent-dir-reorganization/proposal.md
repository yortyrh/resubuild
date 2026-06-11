# Proposal: skills-to-agent-dir-reorganization

## Why

Cursor Agent skills were reorganized from `.cursor/skills/` to `.agent/skills/` to align with the agent-based workflow system. This change moves existing skill files to a new directory location.

## What Changes

- **Moved**: 10 skill directories from `.cursor/skills/` to `.agent/skills/`
  - `goal/`
  - `openspec-apply-change/`
  - `openspec-archive-change/`
  - `openspec-explore/`
  - `openspec-launch-parallel/`
  - `openspec-parallel-integrate/`
  - `openspec-propose/`
  - `openspec-retroactive-commit/`
  - `railway-deploy/`
  - `setup-prod-env/`

## Capabilities

### New Capabilities

None — this is a directory reorganization with no new feature capabilities.

### Modified Capabilities

None — no spec-level behavior changes.

## Impact

- `.cursor/skills/` directory is now empty (deleted)
- `.agent/skills/` contains all moved skill files
- OpenSpec skill references (e.g., in workspace rules) may need path updates if they hardcode `.cursor/skills/`
