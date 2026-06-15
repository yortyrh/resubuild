## Context

The `add-landing-page` change introduced a public `/` route with basic marketing sections. Follow-up work in the working tree applied a Finley / Wealthwise-inspired visual system, fixed broken How It Works layout (inline-flex circles and icons on one row), and aligned `/features` with the same chrome without depending on generated MP4 assets.

## Goals / Non-Goals

**Goals:**

- Single marketing design language across `/` and `/features`.
- CSS-only hero and feature illustrations (no video dependency on marketing routes).
- Shared sticky header with logo, section anchors, Log in, and Get Started Free.
- Demo CTAs route anonymous visitors to `/login`.

**Non-Goals:**

- Regenerating `/public/recordings/*.mp4` assets.
- Session-aware header CTA swapping (`hasSession()` remains client-side via `HomeRedirect` only).
- Dashboard or editor visual changes.

## Decisions

### 1. Finley tokens in `(marketing)/globals.css`

Marketing styles use a `--landing-*` namespace (primary purple, teal accent, paper/ink/muted, gradients) imported only by `(marketing)/layout.tsx`. This keeps dashboard `globals.css` tokens untouched while allowing a distinct public-site palette.

### 2. Hero uses `HeroVisual` (server component)

Instead of `<video src="/recordings/showcase.mp4">`, the hero renders a two-column PDF/CV mock with CSS animations from `landing-animations.css`. This matches reduced-motion requirements (static compare) without a recording deployment gate.

### 3. How It Works — shared connector track

Per-card connectors caused misaligned lines and inline icon layout. The fix uses `.landing-steps` wrapper with one `.landing-steps-track` line and flex-column `.landing-step-card` children so number → icon → title → description stack vertically.

### 4. Features page under `(marketing)/features`

`/features` inherits `(marketing)/layout.tsx` (fonts, `globals.css`, animations). `FeatureIllustration` maps each `RECORDINGS` entry id to a distinct CSS mock; `FeatureRecording` (video) is no longer used on this route.

### 5. CTA target `/login`

**Try the live demo** on `/` and `/features` links to `/login` so anonymous visitors enter the existing auth flow. Header **Get Started Free** remains `/register`.

### 6. Header nav uses root-absolute hash URLs

`/#features`, `/#how-it-works`, `/#faq` work from both `/` and `/features`.

## Risks / Trade-offs

- **Footer "Live demo"** still links to `app.resubuild.dev` — intentional footer link, not the primary demo CTA.
- **`FeatureRecording` component** remains in the codebase for potential reuse; only `/features` stopped importing it.
- **Stale `openspec/changes/add-landing-page/`** folder may exist locally from an earlier archive; unrelated to this change.

## Migration Plan

No migration. Deploy web app only. No env var changes.
