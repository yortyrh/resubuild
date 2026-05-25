## 1. Shared link utilities

- [ ] 1.1 Add `external-link.tsx` with `normalizeResumeUrl` and `ExternalLink` (`target="_blank"`, `rel="noopener noreferrer"`, scheme normalization, unsafe scheme blocking)
- [ ] 1.2 Add colocated `external-link.test.ts` covering HTTPS default, `mailto:`/`tel:` passthrough, empty input, and `javascript:` rejection

## 2. Basics and social profiles

- [ ] 2.1 Update `managed-basics-section.tsx` contact line to render `basics.url` via `ExternalLink` (mixed plain text + link segments)
- [ ] 2.2 Update Social profiles `renderView` in `cv-sections.tsx` to use `ExternalLink` instead of plain text for `item.url`

## 3. Section URL fields in view mode

- [ ] 3.1 Add URL preview lines to Work and Volunteer `renderView` bodies when `item.url` is set
- [ ] 3.2 Add URL preview to Education, Projects, Certificates, and Publications `renderView` bodies when `item.url` is set

## 4. Markdown link parity (if applicable)

- [ ] 4.1 If `MarkdownView` exists, configure Markdown anchor rendering to use the same new-tab/`rel` policy as `ExternalLink`; otherwise skip and note dependency on `markdown-view-rendering`

## 5. Verification

- [ ] 5.1 Run `pnpm --filter web test -- --run` for new and affected tests
- [ ] 5.2 Manually verify Basics website, a social profile URL, and one project URL open in a new tab from view mode
