## Why

Basics view mode currently shows location in a separate right column, profile photos as a plain URL string, and offers upload without cropping or lifecycle management. Authors expect contact details (including address) grouped under the name and a visible, manageable profile photo beside their identity—matching how CVs are read and how other resume builders present basics.

## What Changes

- Move formatted location and optional street address from the Basics `meta` column into the bullet-separated contact line under the name (alongside email, phone, website).
- Display `basics.image` as a profile photo thumbnail to the left of the name and contact block in Basics view mode; remove the raw URL text from the body.
- Show a clear error affordance when the image fails to load (broken URL, missing media, etc.).
- Add **Delete photo** in view mode: clear `basics.image` on the CV and, when the URL is an owned API media URL, delete the media registry row and both original and cropped storage objects.
- Add **Upload photo** with an interactive crop step before persisting; store crop parameters on the media row and persist a server-generated cropped derivative alongside the original.
- Add **Edit crop** for existing owned media photos: reopen the crop UI pre-filled with saved params, regenerate the cropped derivative, and keep `basics.image` pointing at the display URL.
- Extend the media API and database schema to support crop metadata, cropped object storage, authenticated delete, and crop update endpoints.

## Capabilities

### New Capabilities

<!-- None — extends existing cv-editor-ui and resume-media-uploads -->

### Modified Capabilities

- `cv-editor-ui`: Basics view layout (contact line grouping, profile photo thumbnail with error/delete/upload/edit-crop controls).
- `resume-media-uploads`: Crop metadata storage, cropped derivative generation, authenticated media delete, and crop-update API.

## Impact

- **Frontend**: `managed-basics-section.tsx`, new profile-photo UI components (crop dialog, thumbnail), `apps/web/src/lib/api.ts` (delete/crop media helpers).
- **API**: `MediaService`, `MediaController` — new delete and crop endpoints; upload flow accepts optional crop payload or two-step upload-then-crop.
- **Database**: Supabase migration extending `public.media` with `crop` JSONB and `cropped_storage_path`.
- **Storage**: Second object per media id (`{user_id}/{media_id}_cropped.{ext}`).
- **Dependencies**: Client-side crop library (e.g. `react-image-crop`) and server-side image processing (e.g. `sharp`) for derivative generation.
- **Related change**: `basics-address-contact-line` (address-only layout) is superseded by the contact-line portion of this change; implement together or archive the smaller change after merge.
