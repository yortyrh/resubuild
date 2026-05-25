## Context

`ManagedBasicsSection` keeps `ProfilePhotoCropDialog` mounted in both view and edit modes. State `cropImageUrl` initializes to `""` and is cleared after confirm/cancel. The dialog's `<dialog>` element is shown/hidden via `open`, but the inner `<img src={imageUrl}>` always renders—so React sees `src=""` whenever the crop flow is idle.

Existing profile photo behavior (upload, edit-crop, delete) is unchanged; this is a rendering guard fix.

## Goals / Non-Goals

**Goals:**

- Eliminate the Next.js console warning about empty `src` on the crop preview image.
- Keep crop UX unchanged when a valid preview URL is present.
- Add a focused unit test for the guard behavior.

**Non-Goals:**

- Refactoring parent state to use `null` instead of `""` (optional follow-up; component should be defensive regardless).
- Changing `<dialog>` open/close mechanics or crop API flow.
- Replacing `<img>` with Next.js `<Image>` (crop library requires a native img ref).

## Decisions

### 1. Guard image render inside `ProfilePhotoCropDialog`

**Decision:** Render the `<ReactCrop>` + `<img>` block only when `imageUrl` is non-empty (truthy string). When `open` is true but URL is momentarily empty (should not happen in normal flow), show the dialog chrome with a short loading placeholder or empty crop area—no `<img>` element.

**Rationale:** Fixes the warning at the source; any caller passing `""` is safe. Matches React guidance: omit the element or use a valid URL.

**Alternatives considered:**

- _Parent passes `undefined` when closed_ — helps but dialog stays mounted with empty string after cancel until next open; component guard is still required.
- _Unconditionally render `<img src={imageUrl || undefined}>`_ — `undefined` omits the attribute but an `<img>` without `src` can still be problematic; conditional render is clearer.

### 2. Keep dialog mounted in parent

**Decision:** Do not change `ManagedBasicsSection` mount strategy; only fix the child component.

**Rationale:** Minimal diff; parent already manages blob URL lifecycle correctly.

### 3. Unit test with `@testing-library/react`

**Decision:** Add `profile-photo-crop-dialog.test.tsx` beside the component. Assert that when `open={false}` and `imageUrl=""`, no `img` element exists (or none with empty `src`).

**Rationale:** Prevents regression; colocated test matches repo convention.

## Risks / Trade-offs

- **[Brief flash without preview if URL lags]** → Acceptable; current flow sets URL before `open=true` in all call sites (`openCropForFile`, `handleEditCrop`).
- **[Dialog open with no image edge case]** → Confirm button can stay disabled or no-op if `imgRef` is null; existing `handleConfirm` already returns early without `img`.
