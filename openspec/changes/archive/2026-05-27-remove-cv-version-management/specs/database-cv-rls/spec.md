## MODIFIED Requirements

### Requirement: The system SHALL store each CV as a row in `public.cv` with JSON document body

The `public.cv` table MUST include `id` (uuid PK), `user_id` (uuid FK to `auth.users`), JSON Resume `basics` scalar columns (`name`, `label`, `image`, `email`, `phone`, `url`, `summary`), `location jsonb` (default `'{}'::jsonb`), optional legacy columns (`meta_version`, `meta_canonical`, `meta_last_modified`), and `created_at` / `updated_at` timestamps with an index on `(user_id, updated_at desc)` and a trigger to maintain `updated_at` on update. Current application code SHALL NOT populate the `meta_*` columns on insert or update. The table SHALL NOT include a `title` column after cutover. Multi-valued resume sections MUST live in normalized child tables (see `cv-normalized-schema`), not in a `data` jsonb column after cutover.

#### Scenario: Schema matches migration

- **WHEN** migrations are applied as in `supabase/migrations/`
- **THEN** the `public.cv` table exists with the header columns described above, normalized section tables exist with foreign keys to `cv.id`, and `updated_at` is set automatically on row updates

#### Scenario: No jsonb document column after cutover

- **WHEN** the normalized storage migration is complete
- **THEN** `public.cv` SHALL NOT contain a `data` jsonb column
- **AND** `public.cv` SHALL NOT contain a `title` column

#### Scenario: Meta columns unused by management layer

- **WHEN** a CV is created or updated through Nest management APIs
- **THEN** `meta_version`, `meta_canonical`, and `meta_last_modified` SHALL remain null or unchanged from prior values
- **AND** API responses SHALL NOT expose JSON Resume `meta` derived from those columns
