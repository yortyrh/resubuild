## 1. Global scrollbar gutter

- [x] 1.1 Add `scrollbar-gutter: stable` to the `html` element in `apps/web/src/app/globals.css`

## 2. Verification

- [x] 2.1 Manually click through all 13 CV section nav links on a desktop-width viewport and confirm `#cv-section-nav` horizontal position does not shift between Basics (no scroll) and Work/Skills/Projects/Certificates (scrollable)
- [x] 2.2 Confirm no visual regression on dashboard list and auth pages (short content still renders correctly with reserved gutter)

## E2E test impact

- **Must pass unchanged** — no E2E spec updates required for this CSS-only fix. Optional follow-up: add a Playwright layout-stability assertion in a future change.
