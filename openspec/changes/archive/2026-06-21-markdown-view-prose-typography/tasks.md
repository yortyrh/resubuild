## 1. Add `@tailwindcss/typography` to the web app

- [x] 1.1 Install `@tailwindcss/typography@^0.5.20` as a dev dependency in `apps/web/package.json`
- [x] 1.2 Update `pnpm-lock.yaml` to pin the new dependency
- [x] 1.3 Register the plugin in `apps/web/src/app/globals.css` via `@plugin '@tailwindcss/typography';` next to the existing `@plugin 'tailwindcss-animate';` directive

## 2. Layer `prose prose-sm max-w-none` on the MarkdownView block variant

- [x] 2.1 In `apps/web/src/components/cv/markdown-view.tsx`, compute `proseClass = variant === 'block' ? 'prose prose-sm max-w-none' : ''` alongside the existing `variantClass`
- [x] 2.2 Insert `proseClass` into the wrapper's `className` string so the block variant carries `prose`, `prose-sm`, and `max-w-none`
- [x] 2.3 Leave the inline variant unchanged (no `prose`, `prose-sm`, or `max-w-none` classes)

## 3. Remap prose color tokens to project design tokens

- [x] 3.1 In `apps/web/src/app/globals.css`, add a `.markdown-view { ... }` rule block that remaps every `--tw-prose-*` token (`body`, `headings`, `lead`, `links`, `bold`, `counters`, `bullets`, `hr`, `quotes`, `quote-borders`, `captions`, `kbd`, `kbd-shadows`, `code`, `pre-code`, `pre-bg`, `th-borders`, `td-borders`) to the matching project token (`--foreground`, `--muted-foreground`, `--primary`, `--border`, `--muted`)
- [x] 3.2 Add a `@media (prefers-color-scheme: dark) { .markdown-view { ... } }` block that remaps every `--tw-prose-invert-*` token the same way

## 4. Test updates

- [x] 4.1 In `apps/web/src/components/cv/markdown-view.test.tsx`, add a test asserting the block variant's wrapper carries `prose`, `prose-sm`, and `max-w-none`
- [x] 4.2 Add a test asserting the inline variant's wrapper does NOT carry `prose`, `prose-sm`, or `max-w-none`
- [x] 4.3 Verify all existing `markdown-view` / `markdown-view--inline` class-presence assertions still pass (no regression)

## 5. Verification

- [x] 5.1 Run `pnpm --filter @resubuild/web test -- --run` — all web unit tests pass
- [x] 5.2 Run `pnpm --filter @resubuild/web typecheck` — `tsc --noEmit` clean
- [x] 5.3 Run `pnpm --filter @resubuild/web lint` (Biome) and Prettier `--check` on the touched files — both clean
- [x] 5.4 Run `pnpm --filter @resubuild/web build` — `next build` succeeds and the generated CSS bundle contains the `prose`, `prose-sm`, and `max-w-none` utility classes plus the `--tw-prose-*` / `--tw-prose-invert-*` remap inside the `.markdown-view` selector

## E2E test impact

**Must pass unchanged** — this change is web-only and does not modify the Nest API surface, the Supabase schema, the seed fixtures, or the auth flow. The Cover letter tab continues to read its content via the existing `getJobApplication` query and renders the same `MarkdownView` component (now with `prose` classes internally). The change only affects CSS rules emitted to the generated stylesheet; no JSON shape, server-rendered HTML, or DOM structure changes. No E2E specs require updates or additions.
