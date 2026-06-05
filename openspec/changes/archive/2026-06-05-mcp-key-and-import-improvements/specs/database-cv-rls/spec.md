# Database CV storage and RLS (delta)

## Purpose

This delta modifies the `database-cv-rls` capability to add a user-scoped
`DELETE` policy on `public.mcp_api_key`, which is part of the same
retroactive change set that promotes `user_id` to the primary key.

## ADDED Requirements

### Requirement: Row Level Security SHALL allow users to delete their own `mcp_api_key` row

The `public.mcp_api_key` table SHALL have a `DELETE` policy that restricts
deletes to rows where `auth.uid() = user_id`. The policy is created by the
`supabase/migrations/20260604180000_mcp_api_key_delete_policy.sql`
migration: `create policy "Users can delete own mcp_api_key" on
public.mcp_api_key for delete using (auth.uid() = user_id);`. With this
policy in place, a user-scoped Supabase client can delete the row that
the application previously attempted to delete during key rotation (the
upsert path that replaced it no longer requires a delete, but the policy
is required for any future code that issues an explicit delete, and to
match the principle that a user owns their key and can remove it).

#### Scenario: User-scoped delete of the user's own row

- **WHEN** a user's JWT is presented to Supabase and the user issues `delete from public.mcp_api_key where user_id = auth.uid()`
- **THEN** the row is deleted
- **AND** no other user's row is affected

#### Scenario: Cross-tenant delete blocked

- **WHEN** user A's JWT is presented and the user issues `delete from public.mcp_api_key where user_id = '<user B id>'`
- **THEN** the row for user B is not deleted (RLS policy `using (auth.uid() = user_id)` rejects the call)
- **AND** user A receives an empty result (zero rows affected)
