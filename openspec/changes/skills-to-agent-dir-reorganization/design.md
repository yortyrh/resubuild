# Design: skills-to-agent-dir-reorganization

## Context

Cursor Agent skills were previously stored under `.cursor/skills/` and have been reorganized to `.agent/skills/`. This reorganization aligns with the agent-based workflow system architecture. All 10 skill directories (goal, openspec-\*, railway-deploy, setup-prod-env) were moved as a batch.

## Goals / Non-Goals

**Goals:**

- Move all skill files from `.cursor/skills/` to `.agent/skills/`
- Preserve all skill content and file structure exactly

**Non-Goals:**

- No new skills created
- No skill content modifications
- No changes to how skills are referenced by the OpenSpec CLI or workspace rules

## Decisions

1. **Directory target: `.agent/skills/`**
   - Rationale: Aligns with agent-based workflow system; keeps agent-specific assets separate from Cursor IDE configuration.

2. **All skills moved together as a batch**
   - Rationale: Consistent reorganization; avoids mixed state between old and new locations.

3. **No symlinks or redirects**
   - Rationale: Simple move; no indirection needed for this reorganization.

## Risks / Trade-offs

- **[Risk]** OpenSpec CLI or workspace rules reference `.cursor/skills/` path explicitly → **[Mitigation]** Verify workspace rules and OpenSpec config still reference skills correctly; update if needed.
