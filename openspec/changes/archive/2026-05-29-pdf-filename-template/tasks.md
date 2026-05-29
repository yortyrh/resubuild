## 1. Expose Content-Disposition header via CORS

- [x] 1.1 In `apps/api/src/main.ts`, add `exposedHeaders: ['Content-Disposition']` to the CORS configuration so the web app's `fetch` can read the header

## 2. Modify renderPdf to include template label in filename

- [ ] 2.1 In `apps/api/src/cv-export/cv-export.service.ts`, update `renderPdf` to look up the template label from `listTemplates()` using the resolved `templateId`, then append ` - {label}` to the filename before `.pdf`
- [ ] 2.2 Add unit test in `apps/api/src/cv-export/cv-export.service.spec.ts` verifying the filename format `{slugified-name} - {label}.pdf` for a known template id
- [ ] 2.3 Run `pnpm --filter api test -- --testPathPattern="cv-export.service.spec" -- --run` to confirm all tests pass
