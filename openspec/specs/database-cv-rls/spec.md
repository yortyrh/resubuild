# Database CV storage and RLS

## Purpose

Define the canonical shape of persisted CV records and the Postgres row-level guarantees so each user only reads and writes their own data when the API uses a user-scoped Supabase client.

## Requirements

### Requirement: The system SHALL store each CV as a row in `public.cv` with JSON document body

The table MUST include `id` (uuid PK), `user_id` (uuid FK to `auth.users`), `title` (text, default untitled), `data` (jsonb resume payload), and `created_at` / `updated_at` timestamps with an index on `(user_id, updated_at desc)` and a trigger to maintain `updated_at` on update.

#### Scenario: Schema matches migration

- **WHEN** migrations are applied as in `supabase/migrations/`
- **THEN** the `public.cv` table exists with the columns and indexing described above and `updated_at` is set automatically on row updates

### Requirement: Row Level Security MUST restrict `public.cv` to the owning user

RLS SHALL be enabled with policies for SELECT, INSERT, UPDATE, and DELETE such that only rows where `auth.uid() = user_id` are visible or mutable, using `WITH CHECK` on insert/update as appropriate.

#### Scenario: Cross-tenant isolation

- **WHEN** a user’s JWT is presented to Supabase for queries against `cv`
- **THEN** the user SHALL only see or modify rows whose `user_id` matches their `auth.uid()`, regardless of knowing another row’s `id`
