## 1. Basics Edit placement

- [x] 1.1 Remove `actionsPlacement="header"` from `ResumeItemRow` in `apps/web/src/components/cv/managed-basics-section.tsx` so Basics uses default bottom Edit placement

## 2. Simplify ResumeItemRow

- [x] 2.1 Remove the `actionsPlacement` prop and header-branch layout from `apps/web/src/components/cv/cv-item-ui.tsx`; always render Edit (and Delete when present) in the bottom action bar

## 3. Tests and verification

- [x] 3.1 Add or update colocated Vitest coverage asserting Basics view mode renders **Edit** in the bottom action bar (below summary), not in the header row beside the name
- [x] 3.2 Run `pnpm --filter web test -- --run` for affected components and confirm pass
