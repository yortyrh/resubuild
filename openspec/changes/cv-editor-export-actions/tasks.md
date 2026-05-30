## 1. Editor header actions component

- [x] 1.1 Add `CvEditorHeaderActions` with Export dropdown (PDF/JSON) and Preview link
- [x] 1.2 Wire into `CvEditorChrome` with responsive flex-wrap header layout
- [x] 1.3 Place Export before Preview in toolbar order
- [x] 1.4 Hide Export and Preview text labels below `lg`; keep icons and `aria-label`

## 2. Tests

- [x] 2.1 Colocated tests for Export menu downloads and DOM order (Export before Preview)

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — all existing scenarios including auth, CV REST, media, HTML/JSON export, template presentation, import URL validation

### Update required

- None

### Add

- None — UI-only change
