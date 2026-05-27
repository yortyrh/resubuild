## ADDED Requirements

### Requirement: Media SHALL store a thumbnail derivative for editor preview

The `public.media` table SHALL include nullable `thumbnail_storage_path text` pointing at a Storage object no larger than 150×150 pixels while preserving aspect ratio (`fit: inside`, max width 150, max height 150). Thumbnails SHALL be generated as WebP via the same image pipeline as cropped derivatives.

#### Scenario: Thumbnail generated after crop

- **WHEN** an authenticated client successfully applies crop to a media id
- **THEN** the service SHALL write or replace the thumbnail object and set `thumbnail_storage_path` on the media row

#### Scenario: Thumbnail regenerated when basics image is set

- **WHEN** `PATCH /cv/:cvId/basics` sets `image` to an owned API media URL (`/media/{uuid}`)
- **THEN** the service SHALL ensure a thumbnail exists for that media id before returning the basics response

### Requirement: Thumbnail bytes MUST be retrievable via public GET

Nest SHALL expose **`GET /media/:id/thumbnail`** (UUID v4) without Bearer auth, streaming thumbnail bytes when `thumbnail_storage_path` is set. When no thumbnail exists, the handler SHALL respond with 404. Cache headers SHALL match full media GET (`public`, long-lived).

#### Scenario: Editor loads profile preview

- **WHEN** a browser requests `GET /media/{id}/thumbnail` for media with a generated thumbnail
- **THEN** the response SHALL return image bytes at most 150×150 logical pixels (aspect ratio preserved)
- **AND** `Content-Type` SHALL be `image/webp` (or the stored thumbnail format)

## ADDED Requirements

### Requirement: Original upload MUST remain retrievable separately from derivatives

`GET /media/:id/original` SHALL stream bytes from `storage_path` only, regardless of `cropped_storage_path` or `thumbnail_storage_path`. Thumbnail generation SHALL write only to `thumbnail_storage_path` and SHALL NOT modify or replace `storage_path` or `cropped_storage_path`.

#### Scenario: Crop editor loads full upload

- **WHEN** the SPA opens edit-crop for owned media
- **THEN** the crop dialog image source SHALL be `GET /media/{id}/original`
- **AND** `GET /media/{id}` MAY continue to serve the cropped display derivative for `basics.image`

#### Scenario: Thumbnail refresh preserves original object

- **WHEN** `ensureThumbnail` runs after basics save or crop
- **THEN** only `thumbnail_storage_path` SHALL be created or replaced
- **AND** `storage_path` SHALL remain the unchanged original upload

## MODIFIED Requirements

### Requirement: GET media by id MUST serve cropped bytes when available

`GET /media/:id` SHALL stream bytes from `cropped_storage_path` when set; otherwise SHALL stream from `storage_path`. Content-Type SHALL reflect the served object. This route serves the **full** display derivative for `basics.image` and crop editing—not the editor thumbnail.

#### Scenario: Display cropped profile photo at full resolution

- **WHEN** a client loads `basics.image` or the crop dialog preview URL
- **THEN** `GET /media/:id` SHALL return the cropped (or original) full-resolution bytes

#### Scenario: Thumbnail is separate from display URL

- **WHEN** the Basics profile photo thumbnail renders in the editor
- **THEN** it SHALL use `GET /media/:id/thumbnail`, not `GET /media/:id`
