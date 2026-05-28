## Context

The monorepo already generates sample PDFs with `scripts/lib/mit-template-renderer.mjs` and root `puppeteer` (`scripts/generate-sample-pdfs.mjs`). That script is a **starting point** only: section entry typography and skills layout still differ from the classic MIT academic CV (see MIT CAPD / career-office samples—centered header, ruled **ALL-CAPS** section titles, employer/institution bold on the first line with dates right-aligned, job title _italic_ on the second line, skills as bold category labels with comma-separated items).

CV data lives in normalized tables. Dashboard reads are moving to **slim** envelopes (`simplify-cv-read-paths`); section editing uses granular `GET /cv/:cvId/{section}` routes. **Full JSON Resume assembly** (`assembleResume` + profiles merged into `basics`) is appropriate only for export—not for list/detail.

The web editor renders Markdown in view mode via `MarkdownView` (`react-markdown` + sanitize). The sample HTML renderer currently **escapes** summary/highlights as plain text, so export would not match the editor until Markdown is rendered server-side in the template.

## Goals / Non-Goals

**Goals:**

- One **canonical HTML document** per CV used for in-app preview, browser print, and API PDF generation.
- Preview and PDF visually match **classic MIT résumé format** (reference: MIT-style single-column serif CV—centered name/contact, ruled section headers, experience-before-education ordering, 8.5×11 Letter, ~0.5in margins).
- Authenticated export only; RLS-scoped data load on the API.
- Reuse Puppeteer (already in repo) for PDF; fail gracefully when Chromium is unavailable.

**Non-Goals:**

- Replacing section-by-section editor UI with preview as default.
- Multiple themes or user-selectable templates (v1: MIT template only).
- Public share links or SEO-facing resume pages.
- Playwright as a second engine (Puppeteer is sufficient and already used).
- Embedding full resume JSON in `GET /cv/:id` responses.

## Decisions

### 1. Shared `packages/resume-template` with MIT classic layout

**Choice:** TypeScript package exporting `renderResumeHtml(resume: Resume): string` and `renderMarkdownField(value: string): string` (sanitized inline/block HTML). Refactor the existing `.mjs` renderer to implement the MIT layout rules below—not a verbatim port of current HTML structure.

**MIT layout rules (v1):**

| Element           | Rule                                                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page              | Single column; serif stack (Georgia / Times); black on white; ~11pt body; Letter page with print margins                                                                                             |
| Header            | Centered: **name** (largest bold), optional label/subtitle, one centered contact line (address · phone · email · url) with bullet separators; optional profile links on a second line                |
| Section titles    | Bold ALL-CAPS label (e.g. `EXPERIENCE`, `EDUCATION`, `SKILLS`) + full-width bottom border (horizontal rule)                                                                                          |
| Summary           | Section titled `SUMMARY` (not screen-reader-only); justified paragraph body                                                                                                                          |
| Experience (work) | Per entry: line 1 = **employer name** (+ location) left, date range right; line 2 = _position_ italic; optional summary; indented disc bullets for highlights                                        |
| Volunteer         | Same entry pattern as work; section title `VOLUNTEER`                                                                                                                                                |
| Education         | Per entry: line 1 = **institution** left, date range right; line 2 = **study type / area** bold; bullets for courses                                                                                 |
| Skills            | Per skill group: **{name}:** comma-separated keywords (and level when present)—not definition-list cards                                                                                             |
| Other sections    | Projects, awards, certificates, publications, languages, interests, references use the same section-heading + entry patterns (title/entity bold where appropriate, dates right-aligned when present) |

**Section order (work before education):**

1. Header (basics)
2. Summary
3. Experience (`work`)
4. Volunteer
5. Education
6. Skills
7. Projects → Awards → Certificates → Publications → Languages → Interests → References

Omit any section with no content. Do **not** place Education above Experience.

**Rationale:** Matches user expectation and MIT career-office conventions while reflecting JSON Resume data completely.

**Alternatives:**

- Keep current template (position-first work rows, skills as `<dl>`) — rejected; does not match MIT reference.
- Education-first ordering — rejected; user requested work priority.

### 1b. Package placement and consumers

**Choice:** Same as before—API, sample PDF script, and preview consume one package.

**Alternatives:**

- Keep `.mjs` in `scripts/` only — rejected (drift risk).
- Render in Next.js only — rejected (PDF must be server-side).

### 2. Export data path: dedicated assembly in `CvExportService`

**Choice:** `CvExportService` uses existing `CvNormalizedRepository.fetchSections` + `assembleResume`, then merges `profiles` into `basics.profiles` for the template (same shape as sample JSON files).

**Rationale:** Aligns with `simplify-cv-read-paths` — assembly only on export routes. No change to slim `GET /cv`.

**Alternatives:**

- Client assembles from N section GETs — rejected (slow, inconsistent, leaks assembly logic).

### 3. API surface

**Choice:**

- `GET /cv/:id/export/html` → `Content-Type: text/html; charset=utf-8`, full document.
- `GET /cv/:id/export/pdf` → `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="<slug>.pdf"`.

Both guarded by Supabase auth; 404 when CV not owned/found.

**Rationale:** HTML supports iframe/embed preview and is the Puppeteer input for PDF. Separate routes keep caching and content types clear.

**Alternatives:**

- `Accept` negotiation on one URL — rejected (simpler clients with two helpers).

### 4. PDF engine: Puppeteer in `apps/api`

**Choice:** Add `puppeteer` (or `puppeteer-core` + `CHROMIUM_EXECUTABLE_PATH`) to `apps/api`. Reuse options from `generate-sample-pdfs.mjs`: `setContent(html, { waitUntil: 'networkidle0' })`, Letter, `printBackground: true`, 0.5in margins.

**Rationale:** Already a devDependency at repo root; proven with Tailwind CDN in template.

**Alternatives:**

- Playwright — no existing usage; adds weight.
- `@react-pdf/renderer` — different layout model; would diverge from HTML preview.

### 5. Web preview UX

**Choice:** Route `/dashboard/cv/[id]/preview` loads HTML via `getCvExportHtml(cvId)` (Bearer auth). Display in a full-width container with `dangerouslySetInnerHTML` **only after** HTML is fetched from trusted API (not user paste). Toolbar: **Print** (`window.print()`), **Download PDF** (blob from `export/pdf`), **Back to editor**.

**Rationale:** Same HTML as PDF engine input when preview is API-sourced. Print uses built-in browser PDF path with `@media print` rules already in template.

**Alternatives:**

- iframe `src` to API URL — works but complicates auth (blob URL or short-lived token); fetch + srcdoc acceptable v1.

### 6. Markdown in export HTML

**Choice:** Server-side Markdown rendering with an allowlist sanitizer (e.g. `marked` + `sanitize-html`, or `react-markdown` is not suitable on server without DOM). Apply to `basics.summary`, section summaries/descriptions, highlight bullets, `references[].reference`.

**Rationale:** Parity with `cv-editor-ui` Markdown view requirement.

**Alternatives:**

- Strip Markdown to plain text — rejected (preview regression).

### 7. Tailwind CDN in export HTML

**Choice:** Keep CDN script in v1 (matches samples). Document that PDF generation requires network access to `cdn.tailwindcss.com` unless later replaced with compiled CSS.

**Rationale:** Fastest path to visual parity with existing PDFs.

**Risk:** Offline CI/API — mitigate with optional precompiled CSS follow-up (Open Question).

### 8. Media URLs in export

**Choice:** Use absolute URLs for `basics.image` when stored as API media paths (`NEXT_PUBLIC_API_URL` + path or signed URL if added later). Puppeteer must resolve images for PDF.

**Rationale:** Relative `/media/...` paths fail in headless `setContent` without base URL.

## Risks / Trade-offs

| Risk                             | Mitigation                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Chromium missing in production   | HTML export still works; PDF returns 503 with clear message; document Docker image requirements |
| Tailwind CDN blocked/slow        | `networkidle0` timeout config; future: inline compiled Tailwind                                 |
| Markdown XSS in export           | Sanitize after Markdown parse; no raw HTML from users                                           |
| Large CVs slow PDF               | Single-page timeout (e.g. 30s); no concurrent browser per request pool in v1                    |
| `dangerouslySetInnerHTML` in web | Only API-origin HTML; CSP on preview route                                                      |

## Migration Plan

1. Ship `packages/resume-template` and point sample script at it.
2. Add API export module behind feature flag env `CV_EXPORT_PDF_ENABLED` default true locally.
3. Add web preview route and chrome link.
4. Update `openspec/specs/*` on archive.

No database migration.

## Open Questions

- **v1 preview embed:** fetch HTML into `srcDoc` iframe vs full-page HTML — default full-page for simpler print chrome hiding.
- **PDF filename:** derive from `cv.title` or `basics.name` with filesystem-safe slug.
- **Compiled Tailwind:** defer until CDN reliability is an issue in staging; MIT layout may use embedded print CSS + minimal utility classes to reduce CDN dependency long term.
- **Profile photo:** classic MIT samples are text-only; if `basics.image` is set, v1 may omit photo or add a small optional right-aligned headshot—default **omit in v1** unless product requests it.
