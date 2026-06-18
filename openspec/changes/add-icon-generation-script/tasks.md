## 1. Add the icon generator script and config

- [ ] 1.1 Create `scripts/generate-icons.config.mjs` exporting an `outputs` array with entries for `icon.png` (512, margin 0.05), `icon-192x192.png` (192, margin 0.05), `icon-512x512.png` (512, margin 0.05), `maskable-icon-512x512.png` (512, margin 0.10), `apple-touch-icon.png` (180, margin 0.05), and `favicon.ico` (16/32/48, margin 0)
- [ ] 1.2 Create `scripts/generate-icons.mjs` as an ESM script that loads the config, reads `apps/web/public/icon.svg` with `sharp`, rasterizes each PNG entry at `round(size * (1 - 2 * margin))` and composites onto a transparent `size × size` canvas, then writes a multi-resolution `.ico` for the favicon entry
- [ ] 1.3 Add `sharp` to the root `package.json` `devDependencies` at a pinned version (e.g. `^0.33.5`) and run `pnpm install`
- [ ] 1.4 Add a root `pnpm icons:generate` script in `package.json` that runs `node scripts/generate-icons.mjs`

## 2. Wire the icon pipeline into the Turborepo build graph

- [ ] 2.1 In `turbo.json`, add a top-level `icons` task with `outputs: ["apps/web/public/**/*.png", "apps/web/src/app/favicon.ico"]`
- [ ] 2.2 In `turbo.json`, update the `apps/web#build` task to declare `"dependsOn": ["icons"]`

## 3. Regenerate and commit the icon artifacts

- [ ] 3.1 Run `pnpm icons:generate` and verify `apps/web/public/icon.png`, `apps/web/public/icon-192x192.png`, `apps/web/public/icon-512x512.png`, `apps/web/public/maskable-icon-512x512.png`, `apps/web/public/apple-touch-icon.png`, and `apps/web/src/app/favicon.ico` are all written
- [ ] 3.2 Visually inspect the regenerated icons (especially the 192/512 PNGs and the maskable icon) to confirm a visible safe-area margin on every side

## 4. Update web app metadata to use the new icons

- [ ] 4.1 In `apps/web/src/app/layout.tsx`, replace the `metadata.icons` block so the `icon` entries reference `icon.png`, `icon-192x192.png`, and `icon-512x512.png` (no `icon.svg`), and keep the `apple` entry pointing at `apple-touch-icon.png`
- [ ] 4.2 Verify Next.js auto-serves `apps/web/src/app/favicon.ico` as the default favicon (no `<link rel="icon">` change required)

## 5. Add unit tests

- [ ] 5.1 Create `scripts/generate-icons.spec.mjs` (Vitest) asserting every declared output exists after a generation run, every PNG has the declared square dimensions, every PNG with `margin > 0` has fully-transparent outermost border pixels, the favicon is a valid multi-image `.ico`, and a malformed config throws

## 6. Verification

- [ ] 6.1 Run `pnpm icons:generate` twice and confirm idempotency
- [ ] 6.2 Run `pnpm test` (which includes the new `scripts/generate-icons.spec.mjs`) and confirm the new tests pass alongside existing suites
- [ ] 6.3 Run `pnpm build` and confirm Turborepo runs the `icons` task before `apps/web#build`
- [ ] 6.4 Run `pnpm lint` and `pnpm format` to confirm Biome and Prettier pass on the new files
- [ ] 6.5 Open the deployed web app in a browser and confirm the tab favicon is the new margin-padded icon (and that `apps/web/src/app/favicon.ico` is the resolved source)

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — this change is icon/static-asset only and does not touch Supabase, auth, CV CRUD, or the Nest API surface; the full E2E suite must remain green.

### Update required

- None — no API or auth contract changes.

### Add

- None — UI-only (static asset generation) change. New behavior is covered by the colocated Vitest unit test in `scripts/generate-icons.spec.mjs`.
