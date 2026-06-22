## 1. Restore scrollbar-gutter pair in globals.css

- [x] 1.1 Add `html { scrollbar-gutter: stable; }` to `apps/web/src/app/globals.css` immediately above the existing `html body[data-scroll-locked] { margin: 0 !important; padding: 0 !important; }` override so the two rules form a paired unit.
- [x] 1.2 Rewrite the rationale comment block on the `body[data-scroll-locked]` override to explain the new invariant — `scrollbar-gutter: stable` reserves the scrollbar gutter permanently at the page root; the override removes `react-remove-scroll-bar`'s redundant `padding-right` / `margin-right` compensation so the body does not double-count.

## 2. Verify

- [x] 2.1 Run `pnpm --filter web test --run src/components/cv/markdown-editor-impl.test.tsx` and confirm the markdown-editor suite still passes (no regression in the editor wrapper or its mock).
- [x] 2.2 Run `pnpm --filter web typecheck` and confirm `tsc --noEmit` is clean.

## E2E test impact

Per `openspec/specs/e2e-testing/spec.md`, this change touches only the dashboard global stylesheet — one new CSS rule (`html { scrollbar-gutter: stable }`) and one comment block rewritten. There is no behavior change that would alter the Supabase / Nest / Storage E2E contract, and no new component, no new request path, no new mutation, no new dependency.

- **Must pass unchanged** — none. The change has no impact on any E2E spec.
- **Update required** — none.
- **Add** — none. The Block-type dropdown still mounts and saves correctly under local Supabase; the only difference is that the page no longer reflows while the popover is open.
