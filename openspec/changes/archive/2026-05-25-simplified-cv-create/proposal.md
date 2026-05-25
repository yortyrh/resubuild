## Why

The new CV route currently auto-creates an empty CV on page load and immediately redirects to the full editor. That produces orphan "Untitled CV" rows when users navigate away, offers no chance to set a meaningful title or basics first, and feels disconnected from the rest of the editor where changes save only on explicit action.

## What Changes

- Replace the auto-create-on-mount flow at `/dashboard/cv/new` with a simplified create form.
- The form SHALL collect only the CV title and JSON Resume `basics` fields (same field set as the Basics tab edit form, without other resume sections).
- The CV SHALL NOT be persisted until the user clicks an explicit **Save** (or equivalent create) action.
- On successful save, the client SHALL call `POST /cv` with the entered title and resume `data` (including populated `basics`), then navigate to the full CV editor for the new id.
- Remove the transient "Creating your CV…" loading state that implied immediate server-side creation.
- Cancel or back navigation SHALL leave no CV row in the database.

## Capabilities

### New Capabilities

<!-- None — this is a UX flow change within existing web and editor capabilities -->

### Modified Capabilities

- `web-application`: New CV route behavior — form-first creation deferred until Save instead of eager `POST /cv` on mount.

## Impact

- **Frontend**: `apps/web/src/app/dashboard/cv/new/new-cv-page-client.tsx` (major rewrite), new simplified create form component(s), possible reuse of basics field widgets from `managed-basics-section.tsx`.
- **API**: No contract change; existing `POST /cv` with `title` and `data` remains the create endpoint.
- **Dashboard**: CV list no longer accumulates empty drafts from aborted new-CV visits.
- **Testing**: Unit tests for the create form (validation, save payload, no fetch on mount).
