## Context

The CV editor uses `CvSectionLayout` (`apps/web/src/components/cv/cv-section-layout.tsx`) with a sticky left sidebar (`aside` + `#cv-section-nav`) and a flex main content pane. Section navigation uses Next.js `Link` client transitions between `/dashboard/cv/[id]` and `/dashboard/cv/[id]/[section]`.

Manual browser testing (May 2026) clicked all 13 section nav items and measured bounding boxes via DevTools. When content height stays within the viewport (Basics, Social profiles, Volunteer, Education, Awards, Publications, Languages, References), the sidebar `left` position is **33.5px**. When content exceeds viewport height and the browser shows a vertical scrollbar (Work, Skills, Projects, Certificates), the entire shell — sidebar, nav links, breadcrumb, toggle, and content — shifts **7.5px left** (`left: 26px`).

Root cause: no `scrollbar-gutter` reservation on the document root. The scrollbar consumes ~15px of viewport width only on scrollable pages, reflowing the centered `max-w-6xl` main column.

The project already uses `[scrollbar-gutter:stable]` on popover scroll areas (`country-code-field.tsx`, `language-field.tsx`) but not globally.

## Goals / Non-Goals

**Goals:**

- Keep sidebar and main content horizontally stable when switching between short and tall CV sections.
- Apply a minimal, global CSS fix consistent with existing popover patterns.
- Verify all 13 sections maintain identical horizontal positioning after the fix.

**Non-Goals:**

- Changing sidebar width, collapse behavior, or sticky positioning logic.
- Fixing vertical scroll position resets on navigation (separate concern).
- `overflow: hidden` on body (would trap scroll and harm accessibility).

## Decisions

### 1. Use `scrollbar-gutter: stable` on `html`

**Choice:** Add `scrollbar-gutter: stable` to the `html` element in `apps/web/src/app/globals.css`.

**Rationale:** Reserves space for the vertical scrollbar even when content does not overflow, preventing width reflow. Supported in all modern browsers (Chrome 94+, Firefox 97+, Safari 17+). Zero JS; matches existing Tailwind arbitrary property usage in the codebase.

**Alternative considered:** `overflow-y: scroll` on `html` — always shows scrollbar track (even when empty on some OSes); worse aesthetics.

**Alternative considered:** `100vw` width hacks or padding compensation — fragile, breaks on mobile, fights centered layouts.

### 2. Apply to `html` not `body`

**Choice:** Target `html` because scroll height is measured on `document.documentElement` and scrollbar width affects the root viewport box.

**Rationale:** Browser testing showed `document.documentElement.scrollHeight > clientHeight` drives scrollbar appearance; gutter on the scrolling root prevents layout shift for all descendants including the centered `main`.

## Risks / Trade-offs

- **[Risk] Slightly narrower content on short pages** → **Mitigation:** ~15px reserved gutter is acceptable; prevents jarring shift. Same trade-off already accepted on popover lists.
- **[Risk] Older Safari (<17) ignores property** → **Mitigation:** Graceful degradation — layout behaves as today on unsupported browsers only.
- **[Risk] Overlay scrollbars on macOS may not reserve gutter** → **Mitigation:** macOS overlay scrollbars typically do not cause shift; issue observed on systems with classic scrollbars (Windows/Linux, or macOS with "Show scroll bars: Always").

## Migration Plan

Frontend-only CSS change. Deploy with next web release. Rollback: remove the single CSS rule.

## Open Questions

- Optional follow-up: add a Playwright e2e assertion comparing `#cv-section-nav` bounding box across Basics → Work navigation.
