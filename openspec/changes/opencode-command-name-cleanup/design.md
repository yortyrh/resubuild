## Overview

Standardized the `name:` frontmatter field in OpenCode command definition files by removing the leading `/` character that was inconsistently applied across commands.

## Decision

The leading `/` was removed from the `name:` field in all `.opencode/commands/*.md` files. This aligns the command name format with how OpenCode references commands internally (without leading slash) and matches the convention used by other commands in the repository.

## Before / After

### Before

```yaml
---
name: /opsx-apply
id: opsx-apply
---
```

### After

```yaml
---
name: opsx-apply
id: opsx-apply
---
```

## Files Changed

| File                                            | Change                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `.opencode/commands/opsx-apply.md`              | `name: /opsx-apply` → `name: opsx-apply`                           |
| `.opencode/commands/opsx-archive.md`            | `name: /opsx-archive` → `name: opsx-archive`                       |
| `.opencode/commands/opsx-explore.md`            | `name: /opsx-explore` → `name: opsx-explore`                       |
| `.opencode/commands/opsx-launch-parallel.md`    | `name: /opsx-launch-parallel` → `name: opsx-launch-parallel`       |
| `.opencode/commands/opsx-parallel-cleanup.md`   | `name: /opsx-parallel-cleanup` → `name: opsx-parallel-cleanup`     |
| `.opencode/commands/opsx-parallel-integrate.md` | `name: /opsx-parallel-integrate` → `name: opsx-parallel-integrate` |
| `.opencode/commands/opsx-parallel-status.md`    | `name: /opsx-parallel-status` → `name: opsx-parallel-status`       |
| `.opencode/commands/opsx-plan-parallel.md`      | `name: /opsx-plan-parallel` → `name: opsx-plan-parallel`           |
| `.opencode/commands/opsx-propose.md`            | `name: /opsx-propose` → `name: opsx-propose`                       |
| `.opencode/commands/opsx-retroactive-commit.md` | `name: /opsx-retroactive-commit` → `name: opsx-retroactive-commit` |
| `.opencode/commands/railway-deploy.md`          | Header format adjusted                                             |
| `.opencode/commands/setup-prod-env.md`          | Header format adjusted                                             |

## Implementation Notes

This is a pure metadata cleanup. No application code, database schema, or capability specifications are affected.
