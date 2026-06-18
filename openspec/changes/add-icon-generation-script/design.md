## Context

`apps/web/public/icon.svg` is the canonical artwork for the Resumind brand:
a purple-and-teal document mark on a near-white background, drawn on a 5016×
5016 viewBox so it is sharp at any export size. Today, however, the only
artifacts we actually ship to browsers, OS home screens, and PWA launchers
are a handful of static PNGs and an `.ico` committed by hand — sized 180,
192, and 512 px, with **no safe-area margin**. Because the mark bleeds to
the very edges of its viewport, those rasterized outputs are visibly
clipped by rounded-corner masks on iOS and Android, and they collide with
OS chrome (tab bars, badges, status overlays).

We also still expose `icon.svg` as the primary favicon source from
`apps/web/src/app/layout.tsx` (`metadata.icons.icon[0]`). Browsers happily
render SVG favicons, but PWA launchers and many RSS/embed contexts do not,
and SVG icons skip the OS masking pipeline that PNG/ICO icons go through —
so what looks crisp on a desktop tab often looks broken on a phone.

The change is to introduce a small, deterministic Node build step that
re-rasterizes the SVG to every size we ship, with a configurable
**per-output safe-area margin (as a fraction of each output dimension)**, and
to switch the favicon/`metadata.icons` declarations to point at the
generated PNG and ICO so users get the padded versions everywhere.

## Goals / Non-Goals

**Goals**

- One Node 20+ ESM script (`scripts/generate-icons.mjs`) that reads
  `apps/web/public/icon.svg` and emits every required web/PWA icon variant
  in a single run.
- A separate, declarative config (`scripts/generate-icons.config.mjs`)
  listing each output with its `size` and `margin` so future icon sizes or
  margin tweaks are a one-file change.
- A multi-size `favicon.ico` (16/32/48) emitted to
  `apps/web/src/app/favicon.ico`, matching where Next.js auto-serves it
  from the App Router.
- The script is reproducible: re-running it with the same inputs produces
  byte-identical (or near-identical, modulo embedded timestamps) outputs.
- The script is invocable from `pnpm icons:generate` and wired into Turbo
  so `apps/web#build` runs it automatically before packaging.
- Colocated Vitest unit tests assert: outputs exist with declared
  dimensions, margin is actually applied (no colored pixel touches the
  bitmap edge), missing config throws.

**Non-Goals**

- Replacing `icon.svg` as the brand source-of-truth. SVG stays the master;
  everything else is derived.
- Generating animated or themed variants. Icons remain light-mode only for
  v1 (a future change can add a dark variant).
- Server-side dynamic favicon routing. We keep Next.js's convention of
  serving `app/favicon.ico` from the App Router filesystem.
- Changing the brand artwork itself.

## Decisions

### Decision 1: Use `sharp` for rasterization, not a headless browser or `librsvg`

**Why:** `sharp` is the de facto Node image library, built on libvips — fast,
deterministic, zero runtime dependencies beyond libvips binaries it ships
with. It can read SVG, rasterize to a buffer at any size, and composite it
onto a transparent canvas with pixel-precise control. Headless-browser
solutions (Playwright/Puppeteer) add hundreds of MB and CI flakiness for
zero benefit on a flat SVG. `librsvg` bindings exist but are heavier to
install and have weaker PNG/ICO composition ergonomics than `sharp`.

### Decision 2: Apply the margin by compositing the rasterized SVG onto a transparent canvas, not by `extend` or `resize` on the input

**Why:** The margin must be a _safe area_ inside the output bitmap, not
padding added by enlarging the source. The pipeline is:

1. Render the SVG into a square `innerSize × innerSize` buffer where
   `innerSize = round(size * (1 - 2 * margin))` (clamped to ≥1).
2. Composite that buffer onto a transparent `size × size` PNG so the
   artwork is centered with the configured margin on every side.

This matches the spec's mental model ("the output image would add `5px` to
the top, right, left, bottom leaving the image at the center with a size of
`90×90`") and is trivially testable (edge pixels must be transparent for any
`margin > 0`).

### Decision 3: Per-output margin in a config file, not CLI flags

**Why:** The maskable PWA spec requires roughly 10% safe area, but our
standard 192/512 icons look better with 5%, and `favicon.ico` should not be
padded at all (browsers add their own tab-bar rounding). A flat CLI
(`--margin 0.05`) would force every variant to use the same value or
require a noisy multi-flag surface. A small `generate-icons.config.mjs`
file with a `{ outputs: [{ file, size, margin }] }` shape keeps the
defaults reviewable in code review and trivial to extend.

### Decision 4: Favicon is a true multi-resolution `.ico` (16/32/48), not a renamed PNG

**Why:** Browsers prefer real `.ico` containers because they can pick the
resolution that matches the tab bar's display density without resampling.
`sharp`'s `.toFormat('ico')` produces a valid multi-image container from a
list of buffers. We compose three PNG buffers (16/32/48) at the same
margin-less padding policy and bundle them.

### Decision 5: `icon.png` becomes the default favicon source; `icon.svg` is removed from `metadata.icons`

**Why:** Once we have a margin-padded raster, exposing the un-padded SVG
favicon reintroduces the clipping bug for any context that does pick the
SVG. The new `apps/web/src/app/favicon.ico` (Next.js App Router
convention) plus the PNG variants in `metadata.icons.icon[]` cover every
modern browser, OS launcher, and PWA host. We keep `icon.svg` in
`public/` for documentation/brand-kit use, but it is no longer wired into
metadata.

### Decision 6: Turbo task `icons` at the repo root, with `apps/web#build` depending on it

**Why:** Generating icons is a workspace-level artifact (it writes into
`apps/web/public/`) but conceptually a pre-build step for the web app.
A root-level Turbo task with `outputs: ["apps/web/public/**/*.png",
"apps/web/src/app/favicon.ico"]` lets Turbo cache the run when inputs
(`icon.svg` + the config) are unchanged, and lets `apps/web#build` declare
`"dependsOn": ["icons"]` so CI and local builds always re-derive icons
when stale.

### Decision 7: `sharp` is a root-level devDependency, not an `apps/web` dependency

**Why:** The script runs at the workspace root, not inside the Next.js
bundle. Adding `sharp` to `apps/web` would inflate the Lambda/Edge bundle
spec on accident (it is a native module with platform-specific binaries).
Root-level `devDependencies` keeps it out of production app installs
while still allowing the script to resolve it from any cwd via
Node's package resolution rules.

## Risks / Trade-offs

- **[Risk] `sharp` native binaries fail to install on a contributor's
  machine or in CI.** → Mitigation: pin `sharp` to a specific version in
  the root `package.json` (e.g. `^0.33.x`) and rely on its prebuilt
  binaries for Node 20/22 on macOS, Linux, and Windows. The Vitest unit
  test only imports the script (not `sharp` directly), so a missing
  `sharp` will fail loudly at script-run time, not at test time.

- **[Risk] Generated outputs drift from committed artifacts.** → Mitigation:
  the generator is deterministic and idempotent; the script prints a
  summary of written files so a re-run is auditable. Committed outputs are
  regenerated as part of this change so the tree starts consistent. Future
  drift is caught by `pnpm verify`'s build step re-running the Turbo task
  when inputs change.

- **[Risk] Adding margin to `favicon.ico` makes 16×16 icons visually tiny.**
  → Deliberately use `margin: 0` for the favicon so the artwork fills the
  bitmap at the smallest tab-bar density; browsers apply their own visual
  padding.

- **[Risk] Next.js's App Router looks for `apps/web/src/app/favicon.ico`,
  not `apps/web/public/favicon.ico`.** → The generator writes to
  `apps/web/src/app/favicon.ico` (per Next.js 14+ convention); this is
  documented in the config so future maintainers do not move it back to
  `public/`.

- **[Trade-off] Generated PNGs are committed to the repo.** → Pro: zero
  install-time work to view icons, and the apps/web build does not require
  sharp at deploy time. Con: ~1 MB of binary diff churn when the SVG
  changes. Accepted; the artwork changes rarely.

## Migration Plan

1. Land the script + config + tests in a single PR.
2. Land the regenerated PNG/ICO outputs in the same PR.
3. Land the `layout.tsx` metadata switch and the root `package.json`
   `icons:generate` script + Turbo task wiring in the same PR.
4. Rollback: revert the PR. There is no DB or runtime state to undo; the
   only side effect is the regenerated icons, which the prior commit
   still has.

## Open Questions

None — the change is self-contained, the icon set is fixed, and the
favicon destination is dictated by Next.js's App Router convention.
