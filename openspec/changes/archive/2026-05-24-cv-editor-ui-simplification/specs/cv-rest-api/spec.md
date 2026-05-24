## ADDED Requirements

### Requirement: Media routes MUST inherit CV-grade authentication on upload and public read on stream

Nest SHALL classify **`POST /media/upload`** under `MediaController` guarded by the identical Supabase-derived authentication strategy used for `/cv`. **`GET /media/:id`** SHALL be public (no Bearer) and stream stored objects by registry id. Upload handlers MUST remain tenant-isolated via authenticated user id embedded in Storage paths and registry rows.

#### Scenario: Auth parity with CV fetch on upload

- **WHEN** a valid bearer used for `GET /cv/:id` is replayed onto `POST /media/upload`
- **THEN** Nest SHALL authorize identically modulo multipart validation errors

#### Scenario: Public media stream without token

- **WHEN** any client requests `GET /media/{valid_uuid}` without Authorization
- **THEN** Nest SHALL return the image stream when the registry row exists
