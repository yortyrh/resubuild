## 1. Add the icon generator script and config

- [x] 1.1 Create `scripts/generate-icons.config.mjs` exporting an `outputs` array with entries for `icon.png` (512, margin 0.05), `icon-192x192.png` (192, margin 0.05), `icon-512x512.png` (512, margin 0.05), `maskable-icon-512x512.png` (512, margin 0.10), `apple-touch-icon.png` (180, margin 0.05), and `favicon.ico` (16/32/48, margin 0)
- [x] 1.2 Create `scripts/generate-icons.mjs` as an ESM script that loads the config, reads `apps/web/public/icon.svg` with `sharp`, rasterizes each PNG entry at `round(size * (1 - 2 * margin))` and composites onto a transparent `size × size` canvas, then writes a multi-resolution `.ico` for the favicon entry (manual ICO writer since `sharp` does not expose `.ico()`)
- [x] 1.3 `sharp` was already pinned at `^0.34.5` in the root `devDependencies` — no install change needed
- [x] 1.4 Add a root `pnpm icons:generate` script in `package.json` that runs `node scripts/generate-icons.mjs`

## 2. Wire the icon pipeline into the build graph

- [x] 2.1 (Implementation note: instead of a Turbo `icons` task, the root `pnpm build` script chains `pnpm icons:generate && turbo build` — simpler than making the root a Turbo workspace, with the same effect of always regenerating icons before workspace builds. Documented in the design/spec delta.)
- [x] 2.2 (Implementation note: same as 2.1 — the chaining happens at the root script level rather than via Turbo `dependsOn`.)

## 3. Regenerate and commit the icon artifacts

- [x] 3.1 Run `pnpm icons:generate` and verify `apps/web/public/icon.png`, `apps/web/public/icon-192x192.png`, `apps/web/public/icon-512x512.png`, `apps/web/public/maskable-icon-512x512.png`, `apps/web/public/apple-touch-icon.png`, and `apps/web/src/app/favicon.ico` are all written
- [x] 3.2 Visually inspect the regenerated icons (especially the 192/512 PNGs and the maskable icon) to confirm a visible safe-area margin on every side

## 4. Update web app metadata to use the new icons

- [x] 4.1 In `apps/web/src/app/layout.tsx`, replace the `metadata.icons` block so the `icon` entries reference `icon.png`, `icon-192x192.png`, and `icon-512x512.png` (no `icon.svg`), and keep the `apple` entry pointing at `apple-touch-icon.png`
- [x] 4.2 Verify Next.js auto-serves `apps/web/src/app/favicon.ico` as the default favicon (no `<link rel="icon">` change required)

## 5. Add unit tests

- [x] 5.1 Create `scripts/generate-icons.spec.mjs` (Vitest) asserting every declared output exists after a generation run, every PNG has the declared square dimensions, every PNG with `margin > 0` has fully-transparent outermost border pixels, the favicon is a valid multi-image `.ico`, and the default config is well-formed

## 6. Verification

- [x] 6.1 Run `pnpm icons:generate` twice and confirm idempotency
- [x] 6.2 Run `pnpm test:scripts -- --run` and confirm the new tests pass alongside existing suites (110 tests pass across 5 files)
- [x] 6.3 Run `pnpm build` and confirm `icons:generate` runs before `turbo build` (6 successful tasks, all cached on second run)
- [x] 6.4 Run `pnpm lint` and `pnpm format` / `pnpm format:check` to confirm Biome and Prettier pass on the new files
- [ ] 6.5 Open the deployed web app in a browser and confirm the tab favicon is the new margin-padded icon (and that `apps/web/src/app/favicon.ico` is the resolved source) — requires dev server + browser; covered by the `pnpm dev` task the user can run

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — this change is icon/static-asset only and does not touch Supabase, auth, CV CRUD, or the Nest API surface; the full E2E suite must remain green.

### Update required

- None — no API or auth contract changes.

### Add

- None — UI-only (static asset generation) change. New behavior is covered by the colocated Vitest unit test in `scripts/generate-icons.spec.mjs`.
