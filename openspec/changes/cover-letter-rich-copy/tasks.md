## 1. Sanitizer allowlist in shared markdown helper

- [x] 1.1 In `packages/resume-template/src/render-markdown-field.ts` extend `SANITIZE_OPTIONS.allowedTags` with `h1`, `h2`, `h3`, `h4`, `h5`, `h6` (keep existing `p`, `br`, `strong`, `em`, `b`, `ul`, `ol`, `li`, `a`, `code` entries; do NOT add `style`/`class`/`on*` to `allowedAttributes`)
- [x] 1.2 Confirm `allowedAttributes` remains as `{ a: ['href', 'title', 'rel'] }` so headings carry no attributes (matching the design's "no inline style/class/event handlers on `<h*>`" decision)
- [x] 1.3 Leave `allowedSchemes` unchanged

## 2. Sanitizer unit tests

- [x] 2.1 In `packages/resume-template/src/render-resume-html.test.ts` (or `render-markdown-field.test.ts` if created) add a scenario asserting `renderMarkdownField('# Heading')` returns `<h1>Heading</h1>` and does NOT include a literal `#` character
- [x] 2.2 Add a scenario asserting `renderMarkdownField('## Sub\n\n### Tiny')` returns both `<h2>Sub</h2>` and `<h3>Tiny</h3>` in source order
- [x] 2.3 Add a scenario asserting `renderMarkdownField('# <script>alert(1)</script>Hi')` still strips the script tag and keeps the heading text (e.g. `<h1>Hi</h1>`), preserving the existing sanitization guarantee
- [x] 2.4 Add a scenario asserting `renderMarkdownField('<h1 style="color:red">x</h1>')` returns `<h1>x</h1>` with no `style` attribute (default attribute strip)
- [x] 2.5 Existing bold/list/link scenarios must continue to pass unchanged

## 3. Letter HTML heading typography

- [x] 3.1 In `apps/api/src/cv-export/cv-export.service.ts` extend the inline `<style>` block inside `renderLetterHtml` with rules for `h1`–`h6` (sensible `font-size`, `font-weight: 700`, and `margin` per depth); keep the existing `body`, `p`, `strong, b` rules untouched
- [x] 3.2 Keep the `<!DOCTYPE html>` document wrapper, `<html lang="en">`, `<head>`, `<title>`, and `<body>` skeleton as-is so `extractLetterBodyHtml` on the client continues to work

## 4. API service unit tests

- [x] 4.1 In `apps/api/src/cv-export/cv-export.service.spec.ts` (or the letter-html test module) add a scenario asserting `renderLetterHtml('# Heading\n\nbody')` produces an HTML string that contains `<h1>Heading</h1>` inside the body
- [x] 4.2 Add a scenario asserting the rendered letter HTML contains a `<style>` block with a rule targeting `h1` (e.g. `h1 {` substring) so the typography regression is locked
- [x] 4.3 Existing letter-PDF / letter-HTML scenarios must continue to pass unchanged

## 5. Clipboard helper verification

- [x] 5.1 In `apps/web/src/lib/cover-letter-clipboard.test.ts` augment the existing "formats html clipboard without document title" scenario to also assert the body contains `<h1>` / `<h2>` when given input HTML that contains those tags (proves the helper does not re-sanitize away headings)
- [x] 5.2 Add a scenario asserting `formatCoverLetterPlainText` is unchanged (still `${subject}\n\n${markdown}`) so the plain-text fallback contract holds

## 6. Web unit tests

- [x] 6.1 Existing `apps/web/src/components/applications/application-workspace.test.tsx` MUST pass unchanged (the `copyRichText` flow is byte-identical at the call-site level; only the server-rendered HTML it consumes now contains headings)
- [x] 6.2 Run `pnpm -w turbo run test --filter @resumind/web -- --run` — all web unit tests pass

## 7. Lint and format

- [x] 7.1 Run `pnpm -w turbo run lint --filter @resumind/web --filter @resumind/api --filter @resumind/resume-template` — Biome lint clean for all touched files
- [x] 7.2 Run `pnpm -w turbo run format:check` — Prettier formatting clean

## 8. Build the resume-template package before API tests pick up the change

- [x] 8.1 Run `pnpm --filter @resubuild/resume-template build` to compile the sanitizer change into `packages/resume-template/dist/` so `apps/api` (which imports from `dist`) sees the new allowlist. Without this step, the API tests pass source-side but `apps/api`'s Jest still loads the stale compiled JS and the new letter-HTML heading test fails with no `<h1>` in the body. The package's own Vitest runs against the source directly, which is why it passed independently.
- [x] 8.2 Verify the fix by running `node -e "console.log(require('./packages/resume-template/dist/render-markdown-field.js').renderMarkdownField('# H\n\nb'))"` and confirming the output contains `<h1>H</h1>`.

## E2E test impact

**Must pass unchanged** — this change is additive at the sanitizer allowlist and at the letter-HTML `<style>` block. It does not modify the Nest API surface (`GET /applications/:id/export/letter/html` continues to return `text/html` with the same `Content-Type`, response shape, and PDF/HTML parity), the Supabase schema, the seed fixtures, or the auth flow. The existing E2E suite under `apps/api/test/e2e/*.e2e-spec.ts` exercises the letter export routes today and will continue to exercise them; per `openspec/specs/e2e-testing/spec.md`, those specs MUST NOT be edited.

**Update required** — none.

**Add** — none required for this change; clipboard behavior is verified at the unit-test level via `apps/web/src/lib/cover-letter-clipboard.test.ts` (heading survives the helper) and at the integration level via the unchanged API contract tests already covering `GET /applications/:id/export/letter/html`. A new Playwright-style "paste into Gmail" assertion is out of scope (no E2E infrastructure for third-party apps exists in this repo).
