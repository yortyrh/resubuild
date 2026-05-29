## Context

Contact and social information appears in two places:

1. **Server HTML templates** — `packages/resume-template/src/primitives/sections/index.ts` (`renderBasicsHeader`) builds header HTML for classic/modern/tabular/left templates. Contact parts are plain `<span>` / `<a>` joined by `·`. Profiles render network name text only. A dormant `headerStyle === 'icons'` branch uses a Unicode arrow (`☞`) as separator but no field icons.

2. **Web editor** — `managed-basics-section.tsx` renders a bullet-separated contact line with plain text and `ExternalLink` for URL. `profiles-section.tsx` shows `Network — username` text and a linked URL without network icons. Network is a plain `TextField`.

Reference: [JSON Resume registry — thomasdavis](https://registry.jsonresume.org/thomasdavis) shows map-pin, envelope, phone, link, and brand icons per row.

Constraints: Template rendering is pure HTML string output (Tailwind CDN, print/PDF via Puppeteer). No React in `resume-template`. Web already uses Lucide React. Unit tests colocated beside source.

## Goals / Non-Goals

**Goals:**

- Prefix location, phone, email, and website with small monochrome icons in all template header styles and editor Basics view.
- Apply recognizable brand icons for known social networks in template headers and Social profiles view rows.
- Style website links in templates with underline + neutral/sky link colors that remain readable in print (`print:text-inherit` where needed).
- Provide a Network combobox with prioritized suggestions (LinkedIn, Facebook, Instagram, GitHub, Reddit, Discord, X, Dribbble, Behance) plus typeahead and free-text commit.
- Share network-name normalization logic between web and template packages where practical.

**Non-Goals:**

- Changing JSON Resume schema or API payloads.
- Icons in edit-mode form field labels (optional future polish).
- Custom user-uploaded icons or per-template icon themes.
- Replacing bullet/dot separators with icon-only rows (icons prefix each segment; separators may remain or switch to spacing-only per layout).
- Font Awesome or external icon CDNs in template HTML.

## Decisions

### 1. Inline SVG in `resume-template`, Lucide React in `apps/web`

**Choice:** Add `packages/resume-template/src/primitives/icons.ts` exporting small inline SVG string builders (`iconMapPin()`, `iconMail()`, … and brand marks). Web uses Lucide (`MapPin`, `Mail`, `Phone`, `Link`, `Github`, `Linkedin`, etc.) via `apps/web/src/components/cv/contact-icons.tsx` (or similar).

**Rationale:** Template package cannot depend on React. Inline SVG keeps PDF/print self-contained without CDN fetches.

**Alternative considered:** Single shared SVG asset file — rejected; harder to size/color inline per Tailwind class.

### 2. Shared network normalization in `packages/types` or `resume-template`

**Choice:** Add `normalizeSocialNetworkKey(raw: string): string | null` and `SOCIAL_NETWORK_SUGGESTIONS` constant in `packages/resume-template/src/social-networks.ts`, re-export types/labels for web import (web already depends on resume-template or types).

**Rationale:** One mapping table for GitHub/github/GITHUB, X vs Twitter, etc.

### 3. Contact segment markup pattern

**Choice:** Wrap each contact item as `<span class="inline-flex items-center gap-1">ICON TEXT</span>`. Icons get `aria-hidden="true"`; link text remains accessible. Email/phone keep `mailto:` / plain text.

**Template URL styling:** Use classes aligned with editor: `underline decoration-neutral-400 underline-offset-2 hover:text-neutral-600` (print-safe inherit on body text color).

### 4. Template header layout by style

| `headerStyle`                | Contact layout                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `centered`, `design`, `left` | Icon-prefixed segments; centered/left use flex-wrap row with gap (replace middle-dot join where it improves scan). |
| `tabular`                    | Icon-prefixed lines in right column (one field per line, icon + text).                                             |

Profiles line: icon + link label (prefer `username` when set, else network name).

### 5. Basics editor view

**Choice:** Extract `ContactLineItem` component with `type: 'location' | 'phone' | 'email' | 'url'` rendering Lucide + content. Replace bullet string join with flex-wrap `gap-x-3 gap-y-1` and optional middot between items for continuity with existing spec.

**URL:** Continue using `ExternalLink` with existing `resumeExternalLinkClassName` (sky underline); prepend `Link` icon inside the segment wrapper, not inside the anchor trailing icon slot (keep external-tab icon on link or hide duplicate per design — **use link icon before text, keep small external icon after** only if not cluttered; prefer **single link icon before** for contact line consistency with reference).

### 6. Social profiles Network combobox

**Choice:** New `SocialNetworkCombobox` modeled on `CountryCodeField` / `LanguageField`:

- Input shows current value; chevron opens filtered list.
- Prioritized options at top, then alphabetical remainder.
- Typing filters suggestions; **Enter** or **blur** commits free-text value even if not in list.
- `aria-autocomplete="list"`, keyboard navigation like country field.

**Alternative:** shadcn `Combobox` — use if already in project; otherwise extend existing popover+input pattern for consistency.

### 7. Fallback icon for unknown networks

**Choice:** Generic `Share2` or `Globe` Lucide icon (web) and equivalent inline SVG (template).

## Risks / Trade-offs

- **[Brand icon accuracy]** → Use well-known Lucide/simple-icons-style paths; document supported network aliases in tests.
- **[PDF rendering]** → Inline SVG + `currentColor`; verify Puppeteer export for classic template with full contact row.
- **[Print contrast]** → Icons inherit `text-neutral-800`; links use underline not color-only distinction.
- **[Free-text network vs suggestion]** → Combobox must not overwrite custom values on reopen; display raw stored `network` string.

## Migration Plan

No migration. Deploy web + template package together. Existing CV data unchanged. Verify preview/export for sample CV with profiles.

## Open Questions

- None blocking — icon sizing default `size-3.5` / `h-3.5 w-3.5` in web, `class="h-3.5 w-3.5 shrink-0 inline-block"` in template SVG.
