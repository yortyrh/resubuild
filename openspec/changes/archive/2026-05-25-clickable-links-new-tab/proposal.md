## Why

The CV editor stores many URL values (Basics website, social profile links, project URLs, publication links, and similar fields), but view mode often shows them as plain text or omits them entirely. Authors cannot open those destinations from the preview without copying and pasting, which breaks expected resume-preview behavior and makes saved CVs harder to verify. Links should behave like normal web links and open in a new tab so editing context is preserved.

## What Changes

- Introduce a shared **external link** presentation component for read-only URL fields in resume-preview rows.
- Render stored URL values as clickable `<a>` elements with `target="_blank"` and `rel="noopener noreferrer"`.
- Normalize URLs missing a scheme (e.g. `example.com`) to `https://` for safe navigation.
- Apply clickable links in Basics view (website in the contact line), Social profiles tab (profile URL), and every section that exposes a JSON Resume `url` field in view mode (Work, Volunteer, Education, Projects, Awards, Certificates, Publications, and related preview bodies).
- Show URL fields in view mode where they are authored in forms but currently hidden (e.g. Work, Projects).
- Align Markdown-rendered links (from Wysimark fields) with the same new-tab policy when the `markdown-view-rendering` change is present or merged.

## Capabilities

### New Capabilities

<!-- None — link presentation within existing CV editor UI -->

### Modified Capabilities

- `cv-editor-ui`: View-mode resume-preview rows SHALL render every persisted URL field (and URL-like contact segment) as a clickable external link that opens in a new browsing context with appropriate `rel` attributes.

## Impact

- **Frontend**: New shared link helper/component in `apps/web/src/components/cv/`; updates to `managed-basics-section.tsx`, `cv-sections.tsx` (`renderView` for profiles and all sections with `url`), and optionally `markdown-view.tsx` for Markdown-authored links.
- **No API, schema, or database changes**.
- **Tests**: Colocated Vitest tests for URL normalization and link attributes; representative section view integration cases.
