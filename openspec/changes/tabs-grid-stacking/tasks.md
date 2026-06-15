## 1. Shared `Tabs` primitive

- [x] 1.1 Update `apps/web/src/components/ui/tabs.tsx` so the `Tabs` root is a single-column grid (`grid grid-cols-1`).
- [x] 1.2 Pin every `TabsContent` to row 2 / column 1 of that grid via `col-start-1 row-start-2`.
- [x] 1.3 Default `TabsContent` to `forceMount={true}` and hide inactive panels with `data-[state=inactive]:invisible data-[state=inactive]:pointer-events-none`.

## 2. Consumer updates

- [x] 2.1 Remove the now-redundant `space-y-4` class from the `Tabs` root in `apps/web/src/components/applications/application-workspace.tsx`.
- [x] 2.2 Update the two tab-switching tests in `apps/web/src/components/auth/login-form.test.tsx` to scope `getByLabelText` / `getByRole` queries to the active tab panel via `within(panel)`, since all three panels are now mounted simultaneously.

## 3. New colocated unit tests

- [x] 3.1 Add `apps/web/src/components/ui/tabs.test.tsx` with four tests: the root renders as a single-column grid; every panel is pinned to row 2 / column 1; all panels stay mounted regardless of the active tab; inactive panels carry the `invisible` and `pointer-events-none` classes.

## 4. Verification

- [x] 4.1 Run `pnpm --filter @resubuild/web exec vitest run src/components/auth src/components/applications src/components/ui -- --run` and confirm all tests pass.

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — all existing auth, CV, media, export, template-presentation, lifecycle, sections, AI-agent, import-LLM, import-URL, and MCP scenarios. The change is web-only; no REST contract or persistence shape changes.

### Update required

- None

### Add

- None
