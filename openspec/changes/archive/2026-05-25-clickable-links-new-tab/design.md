## Context

The CV editor persists URL values on JSON Resume entities (`basics.url`, `basics.profiles[].url`, `work[].url`, `volunteer[].url`, `education[].url`, `projects[].url`, `certificates[].url`, `publications[].url`). View mode today:

- **Social profiles**: `item.url` rendered as plain text in `<p>` (`cv-sections.tsx`).
- **Basics**: `basics.url` joined into a bullet-separated contact string as raw text (`managed-basics-section.tsx`).
- **Work, Volunteer, Education, Projects, Certificates, Publications**: URL fields exist in edit forms (`type="url"`) but are **not shown** in `renderView` bodies (except profiles).

There is no shared link component; `target="_blank"` / `rel="noopener noreferrer"` are not used anywhere in `apps/web/src/components/cv/`.

A parallel change (`markdown-view-rendering`) will render Markdown-authored links in summaries/highlights; this change covers **dedicated URL fields** and contact-line website segments. Both SHOULD share the same new-tab and `rel` policy.

## Goals / Non-Goals

**Goals:**

- Single shared `ExternalLink` (or `ResumeExternalLink`) component for read-only URL display in resume-preview rows.
- Every non-empty persisted `url` field visible in view mode as a clickable anchor opening a new tab.
- Scheme normalization (`example.com` → `https://example.com`) for navigation; reject or render safely for `javascript:` and empty values.
- Basics website segment in the contact line rendered as a link while preserving bullet-separated layout with email/phone.
- Consistent link styling (`text-sm`, underline on hover, `break-all` or `truncate` where URLs are long).

**Non-Goals:**

- Changing edit-form URL inputs (`TextField type="url"`).
- Making non-URL text clickable (company names, publishers, email addresses—email already has distinct semantics).
- Public resume export/PDF link behavior.
- Auto-linking URLs embedded inside plain-text fields that are not dedicated `url` properties.

## Decisions

### 1. Shared `ExternalLink` component with `normalizeResumeUrl` helper

**Choice:** Add `apps/web/src/components/cv/external-link.tsx` exporting:

- `normalizeResumeUrl(raw: string): string | null` — trim, return `null` if empty; prepend `https://` when no `http://` or `https://` scheme; block `javascript:` and other unsafe schemes.
- `ExternalLink({ href, children?, className? })` — renders `<a href={normalized} target="_blank" rel="noopener noreferrer">` with visible label defaulting to `href` (or truncated display).

**Rationale:** One place for security rules and attributes; easy to test normalization in isolation.

**Alternatives considered:**

- **Inline `<a>` in each `renderView`** — duplicated attributes and normalization; error-prone.
- **Next.js `<Link>`** — intended for in-app routes; external URLs need native `<a>` with `target="_blank"`.

### 2. Contact line: render mixed text and link nodes

**Choice:** Replace the Basics contact `join(' • ')` string with a small `ContactLine` fragment that maps segments: email and phone as plain text; `basics.url` as `ExternalLink`; location/address segments as plain text (per `basics-address-contact-line` if merged).

**Rationale:** A single joined string cannot embed an `<a>` for only the website segment.

**Alternatives considered:**

- **Entire contact line as one link** — wrong when multiple segments exist.
- **Separate line for website only** — rejected; breaks unified contact presentation.

### 3. Section view bodies: show URL below title block or in body

**Choice:** For array sections with `url`, append to `renderView` `body` (or `meta` when only URL + dates):

| Section                    | Placement                                               |
| -------------------------- | ------------------------------------------------------- |
| Social profiles            | Replace plain `<p>{url}</p>` with `ExternalLink`        |
| Work, Volunteer            | Add URL line in `body` when `item.url` set              |
| Education                  | Add URL in `body` when set                              |
| Projects                   | Add URL in `body` when set                              |
| Certificates, Publications | Add URL in `body` when set (alongside issuer/publisher) |

Use muted `text-sm font-normal` wrapper for consistency with other body lines.

### 4. Markdown renderer link parity

**Choice:** When `MarkdownView` exists, configure `react-markdown` `components.a` to use the same `target`, `rel`, and scheme policy (or delegate to `ExternalLink`).

**Rationale:** User expectation is “every link in the CV editor opens in a new tab,” not only schema `url` fields.

If `markdown-view-rendering` is not merged yet, implement `ExternalLink` first; add Markdown `a` override in the same PR or immediately after.

### 5. Accessibility

**Choice:** `ExternalLink` sets `aria-label` when children differ from href (e.g. truncated label); optional visually hidden “(opens in new tab)” only if design review requests—default to browser/OS new-tab affordance to avoid noisy screen reader text on every link.

## Risks / Trade-offs

- **[Risk] Users store non-HTTP URLs (mailto, tel)** → Mitigation: `normalizeResumeUrl` passes through `mailto:` and `tel:` unchanged; only bare hosts get `https://`.
- **[Risk] Long URLs break layout** → Mitigation: `truncate` or `break-all` on link class; full URL in `title` attribute for hover.
- **[Risk] Duplicate work with `markdown-view-rendering`** → Mitigation: Share `ExternalLink`; document dependency in tasks.
- **[Risk] `javascript:` pasted in URL fields** → Mitigation: Unit tests on `normalizeResumeUrl`; render as inert text or omit href if unsafe.

## Migration Plan

Frontend-only deploy. No data migration. Rollback: revert component and `renderView` edits.

## Open Questions

- Should profile photo URL (`basics.image`) remain non-clickable in view mode (display-only “Photo: …” line)? **Default: yes** — image URL is media reference, not a navigation target unless product asks otherwise.
