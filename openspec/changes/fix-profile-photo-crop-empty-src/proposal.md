## Why

`ProfilePhotoCropDialog` mounts an `<img>` with `src={imageUrl}` while `cropImageUrl` in `ManagedBasicsSection` defaults to `""`. React/Next.js warns that an empty `src` can trigger a spurious full-page network request. The dialog is always mounted (even when closed), so the warning appears on every Basics tab load.

## What Changes

- Guard `ProfilePhotoCropDialog` so the crop preview `<img>` is not rendered when `imageUrl` is empty.
- Optionally defer rendering the crop UI until both `open` is true and a non-empty `imageUrl` is available.
- Add a unit test asserting no `<img>` with empty `src` when the dialog is closed or URL is unset.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `cv-editor-ui`: Crop dialog SHALL NOT render an image element with an empty `src` when closed or before a preview URL is set.

## Impact

- **Frontend**: `apps/web/src/components/cv/profile-photo-crop-dialog.tsx` (primary fix); possible minor cleanup in `managed-basics-section.tsx` if parent state typing changes.
- **Tests**: New or extended unit test beside `profile-photo-crop-dialog.tsx`.
- **API / database**: None.
