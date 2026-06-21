## Why

The "Copy letter" button in the application workspace writes to the clipboard with both `text/html` and `text/plain` MIME types — the structural shape is right, but the HTML body is sanitized so aggressively that **markdown headings never reach Gmail**: `# Heading` in the source becomes nothing at all in the clipboard payload (Gmail pastes it as plain text), and `**bold**` works only because `<strong>` happens to be on the sanitizer allowlist. The mismatch between the requirement ("one paste … preserves formatting") and the actual paste result in Gmail is the bug.

Root cause: `renderMarkdownField` in `packages/resume-template/src/render-markdown-field.ts` runs `sanitize-html` with `allowedTags: ['p','br','strong','em','b','ul','ol','li','a','code']`. Markdown headings (`# …`, `## …`, etc.) are converted to `<h1>`/`<h2>` by `marked`, then stripped by the sanitizer before the body ever reaches the API response, the clipboard payload, or the PDF. The same sanitizer is also reused by every CV section render that goes through `renderMarkdownField`, but CV sections aren't authored as headings in practice — cover letters are. The fix is scoped to cover-letter export and clipboard copy, with the CV-side sanitizer untouched to avoid pulling rendered heading semantics into CV templates that have their own section typography.

## What Changes

- **`renderMarkdownField` adds heading tags to its sanitizer allowlist** (`h1`–`h6`) plus minimal attributes (`id` for anchor targets) so markdown headings in cover letters survive both the server-side letter HTML/PDF export and the client-side clipboard copy.
- **Cover-letter HTML export gains heading typography** in its own `<style>` block so the rendered email/PDF reads well (`h1`–`h6` with sensible spacing and weight), independently of CV templates.
- **Clipboard HTML payload preserves heading semantics** by reusing the same exported body that the PDF pipeline uses — the existing `formatCoverLetterHtmlForClipboard` already wraps the export body and prepends the subject line, so no client-side renderer change is required beyond the sanitizer fix.
- **Plain-text fallback is unchanged**: it still ships `formatCoverLetterPlainText` (subject + body) so non-HTML-aware paste targets still get readable text.
- **Sanitizer tightening is local to letter export**: the shared `renderMarkdownField` is also used by `cv-resume-export`, so we narrow its effect by adding headings to the allowlist globally (safe — heading tags have no inline-event surface and CV templates already produce their own `<h*>` for section titles), and we explicitly opt the letter pipeline into the new heading typography via the letter-specific `<style>` block already in `renderLetterHtml`.
- **No API contract change**: `GET /applications/:id/export/letter/html` continues to return a complete HTML document; the body just contains more of the user's intended structure.
- **No client UI change**: the existing "Copy letter" button keeps the same behavior; only the bytes written to the clipboard change.

## Capabilities

### Modified Capabilities

- `job-application-preparation`: the "Users SHALL copy and export the cover letter for email or PDF" requirement is tightened so the rich-text clipboard payload MUST preserve the markdown author's heading structure (not just bold/italic) when pasted into an email editor like Gmail. The corresponding Scenario is split to cover headings specifically and to assert that `<h1>`/`<h2>` from a `# …`/`## …` heading line reach the clipboard HTML.
- `cv-resume-export`: the "Markdown-authored resume fields SHALL render as formatted HTML in export output" requirement gains a heading-sanitization clause covering the shared `renderMarkdownField` helper (allowlist includes `h1`–`h6`) and a letter-specific typography clause for `renderLetterHtml` (heading styles in the `<style>` block). Existing scenarios for bold, sanitization, and CV body rendering remain unchanged.

### New Capabilities

None.

## Impact

- `packages/resume-template/src/render-markdown-field.ts` — extend `SANITIZE_OPTIONS.allowedTags` with `h1`–`h6`; allow `id` attribute on heading tags.
- `packages/resume-template/src/render-markdown-field.test.ts` (new or augmented) — assert that `# Heading` produces `<h1>Heading</h1>` and that `<script>` is still stripped.
- `apps/api/src/cv-export/cv-export.service.ts` — extend the inline `<style>` block in `renderLetterHtml` with heading typography (`h1`–`h6` margin/font-weight); keep the existing serif body styles.
- `apps/api/src/cv-export/cv-export.service.spec.ts` (or letter-html spec) — assert headings are present in the letter HTML body and that `<style>` includes heading rules.
- `apps/web/src/lib/cover-letter-clipboard.ts` — unchanged in shape; verify `formatCoverLetterHtmlForClipboard` keeps stripping the document wrapper but now the inner body includes `<h1>`/`<h2>`.
- `apps/web/src/lib/cover-letter-clipboard.test.ts` — augment the "formats html clipboard without document title" scenario with a heading assertion.
- No changes to: `apps/web/src/components/applications/application-workspace.tsx` (the `copyRichText` flow is already correct), `apps/web/src/components/applications/application-letter-edit-dialog.tsx`, `apps/web/src/lib/api.ts`, the Nest controller, the Supabase schema, or any seed fixtures.
- No new packages, no new endpoints, no migration.
