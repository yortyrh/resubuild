## 1. Workspace layout refactor

- [ ] 1.1 In `apps/web/src/components/applications/application-workspace.tsx`, replace the `grid gap-6 lg:grid-cols-2` wrapper with a single `surface-soft text-card-foreground` container that hosts the `Tabs` primitive.
- [ ] 1.2 Add imports for `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`.
- [ ] 1.3 Move the existing Job summary `dl`, the `TailoredCvPanel` invocation, and the cover letter `MarkdownEditor` + action buttons into three `TabsContent` panels (ids: `summary`, `tailored-cv`, `cover-letter`).
- [ ] 1.4 Render a `TabsList` with three `TabsTrigger` elements labeled Job summary, Tailored CV, Cover letter, in that order.

## 2. Session-storage persistence

- [ ] 2.1 In `apps/web/src/components/applications/application-workspace.tsx`, add a `useState` initialized by reading `sessionStorage['application-workspace:lastTab']`; if the value is not one of `summary | tailored-cv | cover-letter`, fall back to `summary`.
- [ ] 2.2 Pass the initial value to `Tabs` as `defaultValue` and add an `onValueChange` handler that writes the new tab id to `sessionStorage['application-workspace:lastTab']`.
- [ ] 2.3 Guard the read/write in `try/catch` so `sessionStorage` access (e.g. in private browsing) does not crash the page; on failure, behave as if no value is stored.

## 3. Cover-letter tab state preservation

- [ ] 3.1 Keep the `markdownEditorRef`, `letterDraft` state, and the `useEffect` that hydrates the editor from `data.coverLetter` in the parent component (do not move them into the `TabsContent`).
- [ ] 3.2 Verify that switching tabs does not lose unsaved letter draft text (the editor stays mounted, draft stays in `letterDraft`).

## 4. Styling and design system alignment

- [ ] 4.1 Use the existing `surface-soft text-card-foreground` wrapper as the only elevated chrome; do not nest a second `surface-soft` inside each `TabsContent`.
- [ ] 4.2 Confirm tab trigger labels render in `TabsList` default shadcn styling; do not add a manual `border`/`rounded-lg` chrome on the tab strip.

## 5. Unit tests

- [ ] 5.1 Create `apps/web/src/components/applications/application-workspace.test.tsx` (Vitest, colocated) covering: renders three tab triggers; reading `sessionStorage['application-workspace:lastTab']` of `cover-letter` activates the Cover letter tab on mount; an unknown stored value falls back to `summary`; clicking a tab writes the new id back to `sessionStorage`.
- [ ] 5.2 Run `pnpm --filter web test -- --run` and ensure the new tests pass.

## 6. Manual verification

- [ ] 6.1 Open `/dashboard/applications/[id]` for a `ready` application and confirm three tabs are visible and one panel is shown at a time.
- [ ] 6.2 Switch to Cover letter, type a draft, switch to Job summary, switch back to Cover letter — confirm the draft is preserved.
- [ ] 6.3 Reload the page — confirm the last selected tab remains active.
- [ ] 6.4 Run `pnpm verify` at the repo root and confirm format, lint, typecheck, and unit tests all pass.

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — workspace navigation, prepare/list, cover letter save, PDF download scenarios must keep passing; the route `/dashboard/applications/[id]` and its API calls are unchanged.

### Update required

- None — the change is UI-only on the existing route and does not alter any API request/response contract.

### Add

- None — UI-only change.
