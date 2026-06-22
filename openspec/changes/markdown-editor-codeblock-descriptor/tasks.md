## 1. Plugin wiring

- [x] 1.1 In `apps/web/src/components/cv/markdown-editor-impl.tsx`, import `codeMirrorPlugin` from `@mdxeditor/editor`.
- [x] 1.2 In the `freeForm` branch of the `useMemo` plugin builder, pass `defaultCodeBlockLanguage: 'txt'` to `codeBlockPlugin()`.
- [x] 1.3 In the same branch, add `codeMirrorPlugin({ codeBlockLanguages: { js: 'JavaScript', css: 'CSS', txt: 'text', tsx: 'TypeScript' } })` so a matching `CodeBlockEditorDescriptor` is registered.

## 2. Test coverage

- [x] 2.1 In `apps/web/src/components/cv/markdown-editor-impl.test.tsx`, mock `codeMirrorPlugin` to return the sentinel `'codeMirrorPlugin'`.
- [x] 2.2 Update the freeForm plugin-count assertion from 10 to 11 and rename the test to mention `codeMirror`.

## 3. Verification

- [x] 3.1 Run `pnpm --filter @resubuild/web test -- markdown-editor-impl` — all unit tests pass.
- [x] 3.2 Run `pnpm --filter @resubuild/web typecheck` — no TS errors.
- [x] 3.3 Run `pnpm biome check apps/web/src/components/cv/markdown-editor-impl.{tsx,test.tsx}` — lint clean.

## E2E test impact

None — UI-only change inside an existing component. The behavior under test (cover-letter editor renders + `InsertCodeBlock` does not crash) is covered by the colocated unit tests for `MarkdownEditorImpl`; no `apps/web/e2e` selectors or scenarios need to change.
