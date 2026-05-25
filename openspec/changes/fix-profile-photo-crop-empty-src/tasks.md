## 1. Component fix

- [ ] 1.1 In `apps/web/src/components/cv/profile-photo-crop-dialog.tsx`, wrap the `<ReactCrop>` + `<img>` block in a conditional so it renders only when `imageUrl` is non-empty
- [ ] 1.2 Ensure `handleConfirm` remains safe when no image is mounted (early return if `imgRef.current` is null)

## 2. Tests

- [ ] 2.1 Add `apps/web/src/components/cv/profile-photo-crop-dialog.test.tsx` asserting no `<img>` with empty `src` when `open={false}` and `imageUrl=""`
- [ ] 2.2 Add test case: when `open={true}` and `imageUrl` is a valid string, an `<img>` with that `src` is present

## 3. Verification

- [ ] 3.1 Run `pnpm --filter web test -- --run profile-photo-crop-dialog` and confirm tests pass
- [ ] 3.2 Manually open Basics tab and confirm the Next.js empty-`src` console warning no longer appears before opening the crop dialog
