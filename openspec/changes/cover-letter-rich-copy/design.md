## Context

The application workspace exposes a **Copy letter** button (`apps/web/src/components/applications/application-workspace.tsx`, `copyRichText`). Today it:

1. Calls `getApplicationLetterHtml(applicationId)` → `GET /applications/:id/export/letter/html` → `CvExportService.renderLetterHtml(markdown)` which wraps `renderMarkdownField(markdown)` in a full `<!DOCTYPE html>` document with inline `<style>` for `body`, `p`, `strong, b`.
2. Calls `formatCoverLetterHtmlForClipboard(emailSubject, html)` (`apps/web/src/lib/cover-letter-clipboard.ts`) which extracts `<body>` contents and prepends `<p><strong>Email subject:</strong> …</p><hr>`.
3. Writes a `ClipboardItem` with `text/html` and `text/plain` MIME types via `navigator.clipboard.write`.
4. Falls back to `clipboard.writeText(plain)` if `ClipboardItem`/`text/html` is unavailable.

The shape is correct: Gmail's compose window reads the `text/html` payload, applies its own heading/bold styles to `<h1>`, `<h2>`, `<strong>`, etc., and ignores the `<style>` block. So if the body contained `<h1>Dear Hiring Manager,</h1>` Gmail would render that as a heading.

But `renderMarkdownField` (`packages/resume-template/src/render-markdown-field.ts`) runs:

```ts
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'b', 'ul', 'ol', 'li', 'a', 'code'],
  allowedAttributes: { a: ['href', 'title', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
};
```

`marked` parses `# Heading` into `<h1>Heading</h1>`, then `sanitize-html` strips the `<h1>` because it isn't on the allowlist. By the time the HTML reaches the clipboard, the heading is gone. **Bold survives only because `<strong>` is allowlisted**, not because the sanitizer is permissive.

Net result for a typical cover letter:

- `**Strong intro**` → `<strong>Strong intro</strong>` in clipboard → **bold in Gmail ✓**
- `# My section title` → `<p>My section title</p>` (heading swallowed) → **plain text in Gmail ✗**
- `## Subheading` → swallowed → **plain text in Gmail ✗**

The user perceives the button as "copying markdown source" instead of "copying formatted text."

Two surfaces are affected: the clipboard payload (client-side) and the letter PDF export (server-side). Both go through `renderMarkdownField`. The CV export also uses `renderMarkdownField`, but CV templates build their own `<h*>` for section titles (`sectionHeading` in `packages/resume-template/src/primitives/sections/index.ts`), so heading tags appearing inside section body content is the exception, not the rule. The sanitizer change must therefore be safe for CV templates but only materially affects cover-letter rendering.

The on-screen letter preview already uses `MarkdownView` with Tailwind `prose` typography (`apps/web/src/components/cv/markdown-view.tsx`), so headings already render visually in the workspace tab. The mismatch is only between what's on screen (headings rendered) and what `Copy letter` puts on the clipboard (headings stripped).

## Goals / Non-Goals

**Goals:**

- Markdown headings (`# …` through `###### …`) in `cover_letter` survive sanitization and arrive as `<h1>`–`<h6>` in:
  - the `text/html` clipboard payload written by **Copy letter**
  - the response body of `GET /applications/:id/export/letter/html`
  - the PDF generated from that HTML via `renderLetterPdf`
- The Gmail paste target applies its built-in heading typography to those `<h*>` elements (no Gmail-side work required).
- Sanitizer remains safe: script/event-handler injection vectors are unchanged; no inline `style` or `class` attributes introduced on headings.
- Existing requirement that `**bold**` works continues to hold (`<strong>` is already on the allowlist).
- All existing tests for `renderMarkdownField`, `cv-export.service`, `cover-letter-clipboard`, and `application-workspace` continue to pass unchanged.

**Non-Goals:**

- Not changing the on-screen `MarkdownView` rendering (it already renders headings via Tailwind `prose`).
- Not changing the CV export body renderer (`renderResumeHtml`) or CV section heading typography — those go through `sectionHeading`, which builds its own `<h*>` and is unaffected.
- Not changing sanitizer semantics for tags other than headings (e.g. we are not adding `img`, `table`, `blockquote`, `pre`, `hr`).
- Not adding inline CSS classes or styles to the rendered headings in the clipboard payload; Gmail strips them anyway, and minimal inline styles would create a `<style>`-vs-inline-style smell without helping.
- Not introducing a new endpoint, helper, or client-side markdown renderer.
- Not modifying the plain-text fallback format — `formatCoverLetterPlainText` already prepends the email subject and ships the markdown body as-is (markdown syntax visible, which is the standard plain-text convention).

## Decisions

### Decision 1: Extend the shared `SANITIZE_OPTIONS.allowedTags` rather than branching in `renderMarkdownField`

The sanitizer lives in a shared helper used by both CV export (`cv-export.service`) and letter export (`renderLetterHtml`). Adding `h1`–`h6` to the allowlist:

- Has zero impact on CV templates that already build their own `<h*>` via `sectionHeading` — those headings are constructed by template code, not by `marked` parsing of user markdown.
- Slightly enlarges the trust surface (now `marked` + sanitizer output can include `<h*>`), but headings have no inline-event surface (`onclick`, `onload`, etc. are still blocked), and the existing `allowedAttributes` is already restrictive (only `a` gets attributes), so we extend attributes on headings to just `id` (for fragment-anchor use; otherwise no attributes).
- Avoids a per-call-site `allowedTags` override, which would split the sanitization contract into N variants and make audit harder.

**Alternatives considered:**

- _Branch inside `renderMarkdownField` via an options arg_ (`{ allowHeadings: true }` for letters only): cleaner in intent but introduces a footgun where any future caller (e.g. a new section renderer) opts out of headings for the wrong reason. The shared allowlist is the safer default.
- _Switch letter export to a separate renderer that doesn't sanitize_: rejected — sanitization is the only thing keeping markdown injection out of Gmail's paste buffer.

### Decision 2: Add a `transformTags` rule that maps `<h1>`–`<h6>` back to themselves with attribute stripping, instead of relying on the default sanitizer behavior

`sanitize-html`'s default behavior with the extended allowlist will preserve `<h1>`–`<h6>` and strip all attributes. We do not need a `transformTags` rule unless we want to enforce something extra (e.g. only `id`). Decision: keep it simple. The default attribute strip on `<h*>` is exactly what we want — no `style`, no `class`, no event handlers, no `aria-*`. If a future requirement needs `id` for anchor links, we can add it via `allowedAttributes`.

### Decision 3: Add heading typography to `renderLetterHtml`'s `<style>` block, not the shared CV `<style>`

`renderLetterHtml` already has a letter-specific inline `<style>` (`body`, `p`, `strong, b`). We extend it with `h1`–`h6` rules:

- `h1`: `font-size: 1.5rem; font-weight: 700; margin: 1.5rem 0 0.75rem;`
- `h2`: `font-size: 1.25rem; font-weight: 700; margin: 1.25rem 0 0.5rem;`
- `h3`–`h6`: progressively smaller, same weight, smaller top margin.

Why letter-only: CV templates set their own heading typography via `sectionHeading` and Tailwind classes on `<h*>` elements; the letter `<style>` block is independent. Mixing letter heading CSS into a shared template `<style>` would risk colliding with CV section styling.

Why inline `<style>` vs. CSS module vs. styled `<h*>` attributes: inline `<style>` is what Gmail/paste targets strip immediately. The browser viewing the PDF or print preview keeps the `<style>` block intact, so it only needs to be readable in the export context. Inline `style="…"` on the heading element itself would survive both — but adds HTML verbosity and an extra sanitization concern (`sanitize-html` doesn't allow `style` by default, so we'd have to extend `allowedAttributes` further). Inline `<style>` is the smaller, safer surface.

### Decision 4: Client-side: no change to `formatCoverLetterHtmlForClipboard`

The helper already strips the document wrapper (`extractLetterBodyHtml`) and prepends the email-subject block. Once `renderLetterHtml` returns a body containing `<h1>`/`<h2>`, the clipboard payload will contain them automatically. Adding a second sanitizer pass on the client would re-introduce the same heading-stripping bug. **No client-side renderer change.**

### Decision 5: Plain-text fallback keeps markdown syntax visible

The `text/plain` payload is built by `formatCoverLetterPlainText(emailSubject, letter)` which returns `${emailSubject}\n\n${letter}` with the raw markdown. Some users prefer plain text with `#` markers preserved (signals "this came from Markdown, please format if needed"); others prefer it stripped. Today it's preserved — out of scope to change. The fix for "headings disappear in Gmail" is the `text/html` payload; that path is what 99% of users hit in Gmail, Outlook web, and rich-text editors.

### Decision 6: No new sanitization options for tags we don't need

We deliberately do **not** add: `img` (cover letters don't carry images; PDF export path handles its own media rewrite), `table` (not used in cover letters; complex to style), `blockquote` (low value, can be added later), `hr` (the subject separator already uses an inline-styled `<hr>` generated client-side, not from markdown), `pre`/`code` (cover letters rarely have code blocks). Keeping the allowlist minimal reduces audit surface.

## Risks / Trade-offs

- **[Heading injection in PDF / clipboard]** — If a malicious cover-letter author includes a heading with an `onload` or other event attribute, `sanitize-html` already strips them by default (no `allowedAttributes` entries for headings). Heading tags themselves have no scripting surface beyond attributes, so this is not a regression. Mitigation: covered by the existing "sanitize markdown to safe html" scenario (`packages/resume-template/src/render-resume-html.test.ts`).
- **[Style bleed into PDF]** — Letter-only heading CSS in `renderLetterHtml` `<style>` is namespaced by the fact that it's a different HTML document than the CV export. The two exports don't share a render target, so there's no bleed. Mitigation: existing letter PDF scenarios cover "PDF bytes match HTML preview content" — we'll add a heading scenario.
- **[Existing CV section bodies that contain markdown headings]** — If a CV author previously wrote `# Heading` inside a work summary, those headings would have been stripped silently. After this change, they appear as `<h1>`. That's arguably more correct (the user wrote a heading), but it can shift CV section visuals if the CV template renders section body content raw (it doesn't — `cv-resume-html` template wraps section body content in `<div class="text-neutral-900">` and lets Tailwind handle it). Risk: low. Mitigation: scan `.samples/resumes/` for any sample using `#` inside a section body during PR review.
- **[Plain-text fallback stays unstyled]** — A user pasting into a plain-text-only target still sees `# Heading` syntax. This is consistent with the existing fallback behavior and is a property of the user's paste target, not our code. Not addressed here.
- **[Heading depth semantics]** — Markdown allows `######` (h6) but most email editors collapse anything below `<h3>` to the same style. We allow all six so the source structure is preserved; downstream renderers can collapse as they wish.
- **[`<h*>` styling in `MarkdownView`** already renders headings via Tailwind `prose`; this change makes the **exported** and **copied** HTML match the on-screen preview. If a future iteration wants different heading sizes in the email vs. the on-screen preview, the export `<style>` block is the place to adjust.

## Migration Plan

No migration. The change is:

1. A sanitizer allowlist extension in `packages/resume-template/src/render-markdown-field.ts` (additive — no tag removal).
2. A CSS block extension in `apps/api/src/cv-export/cv-export.service.ts` (`renderLetterHtml`, additive).
3. A new sanitizer scenario in `packages/resume-template/src/render-resume-html.test.ts` (or `render-markdown-field.test.ts`).
4. A new heading scenario in `apps/api/src/cv-export/cv-export.service.spec.ts`.
5. An augmented scenario in `apps/web/src/lib/cover-letter-clipboard.test.ts`.

Rollback: revert the two commits. The sanitizer strips headings again; the letter PDF returns to its previous (heading-free) layout. No data migration, no API contract change, no client-side state to clean up.

Deploy: ship the package change and the API change together. The web app needs no rebuild because the client behavior is byte-identical (the clipboard payload format is unchanged; only its content is enriched).

## Open Questions

- _Should the letter export wrap the body in a Gmail-friendly `<div style="font-family: Arial, sans-serif;">` so pasted text picks up a familiar email look without the user picking a font?_ — Out of scope. Gmail's compose window already applies its own font to pasted HTML; we don't need to fight it. Deferred.
- _Should the email subject line above the body use a `<h2>` for visual hierarchy, or stay a `<p><strong>` block?_ — Today it's `<p><strong>Email subject:</strong> …</p>` followed by `<hr>`. Keeping that avoids touching the client's `formatCoverLetterHtmlForClipboard`. Deferred unless users complain.
- _Should headings in cover letters that came from the AI agent be auto-normalized to a single depth (e.g. everything becomes `<h2>`)?_ — Out of scope. Users who want flat structure can edit the markdown in the cover-letter edit dialog.
- _Should the sanitizer's new `h1`–`h6` allowlist apply only to letter export, leaving CV export untouched?_ — Considered. Decided against for safety: a shared allowlist is auditable; per-call overrides accumulate drift over time. The CV templates don't render `<h*>` from `marked` output anyway, so the effective change is zero for CV exports.
