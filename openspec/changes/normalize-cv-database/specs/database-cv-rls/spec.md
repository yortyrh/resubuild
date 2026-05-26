## MODIFIED Requirements

### Requirement: The system SHALL store each CV as a row in `public.cv` with JSON document body

The `public.cv` table MUST include `id` (uuid PK), `user_id` (uuid FK to `auth.users`), `title` (text, default untitled), flattened meta columns (`meta_version`, `meta_canonical`, `meta_last_modified`), and `created_at` / `updated_at` timestamps with an index on `(user_id, updated_at desc)` and a trigger to maintain `updated_at` on update. Resume body content MUST live in normalized child tables (see `cv-normalized-schema`), not in a `data` jsonb column after cutover.

#### Scenario: Schema matches migration

- **WHEN** migrations are applied as in `supabase/migrations/`
- **THEN** the `public.cv` table exists with the header columns described above, normalized section tables exist with foreign keys to `cv.id`, and `updated_at` is set automatically on row updates

#### Scenario: No jsonb document column after cutover

- **WHEN** the normalized storage migration is complete
- **THEN** `public.cv` SHALL NOT contain a `data` jsonb column

### Requirement: Row Level Security MUST restrict `public.cv` to the owning user

RLS SHALL be enabled on `public.cv` and every normalized CV child table with policies for SELECT, INSERT, UPDATE, and DELETE such that only rows linked to a `cv` record where `auth.uid() = user_id` are visible or mutable, using `WITH CHECK` on insert/update as appropriate.

#### Scenario: Cross-tenant isolation on cv header

- **WHEN** a user's JWT is presented to Supabase for queries against `cv`
- **THEN** the user SHALL only see or modify rows whose `user_id` matches their `auth.uid()`, regardless of knowing another row's `id`

#### Scenario: Cross-tenant isolation on section rows

- **WHEN** a user's JWT is presented for queries against `cv_work` (or any other normalized section table)
- **THEN** the user SHALL only see or modify rows whose parent `cv.user_id` matches their `auth.uid()`
