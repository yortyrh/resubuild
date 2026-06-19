## Context

The web app's icon system is already fully specified by the existing `web-icon-generation` capability (`openspec/specs/web-icon-generation/spec.md`). The pipeline is:

- Single source: `apps/web/public/icon.svg`
- One Node script: `scripts/generate-icons.mjs` driven by `scripts/generate-icons.config.mjs`
- Generated outputs (per `scripts/generate-icons.config.mjs`):
  - `apps/web/public/icon.png` (1024×1024, transparent, 5% margin)
  - `apps/web/public/icon-192x192.png` (192×192, transparent, 5% margin)
  - `apps/web/public/icon-512x512.png` (512×512, transparent, 5% margin)
  - `apps/web/public/apple-touch-icon.png` (180×180, transparent, 5% margin)
  - `apps/web/public/maskable-icon-512x512.png` (512×512, solid backdrop, 10% margin)
  - `apps/web/src/app/favicon.ico` (multi-resolution 16/32/48, margin 0)
- Entrypoint: root `pnpm icons:generate` (also called from root `pnpm build`)

The brand artwork has been re-traced via VTracer, producing a smaller, cleaner vector. Every generated artifact is therefore stale, plus a leftover intermediate `apps/web/public/vectorized.svg` from the previous tracing attempt is no longer needed.

## Goals / Non-Goals

**Goals:**

- Swap the source SVG with the VTracer-rebuilt artwork.
- Regenerate every pipeline output so the web app + PWA surface the redesigned mark consistently.
- Remove the obsolete `vectorized.svg` intermediate.
- Preserve pipeline behavior already locked down by `web-icon-generation` (no new config, no new sizes, no margin tweaks).

**Non-Goals:**

- No changes to `scripts/generate-icons.mjs` or `scripts/generate-icons.config.mjs`.
- No changes to `package.json` `icons:generate` / `build` scripts.
- No changes to `apps/web/public/manifest.ts` / PWA metadata (paths and sizes remain identical).
- No changes to `apps/web/src/app/layout.tsx` icon metadata references.

## Decisions

### Reuse the existing `pnpm icons:generate` pipeline verbatim

The pipeline already encodes the spec-mandated behavior (sizes, margins, transparent vs solid, multi-resolution favicon). Re-running it after swapping the SVG is sufficient — no script edits, no config edits.

**Alternative considered:** hand-editing the PNG/ICO files. Rejected: would diverge from the source of truth and break the spec scenario "Re-running the script is idempotent for unchanged inputs."

### Delete `apps/web/public/vectorized.svg`

It was an intermediate file from the previous tracing attempt, never referenced by the app, the manifest, the layout metadata, or the icon pipeline. Keeping it would leave a stale, misleading asset in `apps/web/public/`.

**Alternative considered:** moving it to `apps/web/public/_archive/`. Rejected: adds noise without value; git history already preserves the file.

## Risks / Trade-offs

- **Visual regression** — The regenerated PNG/ICO artifacts are visibly different from the previous set (different underlying artwork). Anyone with the old PNGs cached in browsers will see a brief mismatch until cache invalidates.
  → Mitigation: This is intentional; the regenerated artifacts are the desired state. Browsers re-fetch PWA icons on `manifest` version bump; favicon cache clears with a hard refresh.
- **Icon-source single point of truth** — If the SVG is later edited but `pnpm icons:generate` is skipped, the PNGs will desync.
  → Mitigation: root `pnpm build` already invokes `pnpm icons:generate` first (per `web-icon-generation` spec). CI catches divergence.

## Migration Plan

1. Replace `apps/web/public/icon.svg` with the VTracer-rebuilt artwork.
2. Run `pnpm icons:generate` to regenerate every PNG/ICO.
3. Delete `apps/web/public/vectorized.svg`.
4. Verify outputs: file sizes sane, PNGs valid (192/512/180/1024 + maskable 512), ICO contains 16/32/48.
5. Commit changes via the standard pipeline.

**Rollback:** `git checkout -- apps/web/public/` restores all icons + reintroduces `vectorized.svg`.

## Open Questions

None.
