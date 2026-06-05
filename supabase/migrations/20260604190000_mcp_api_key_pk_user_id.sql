-- Enforce "one active key per user" at the schema level by making user_id the
-- primary key of mcp_api_key. A primary key is implicitly UNIQUE and NOT NULL,
-- so the table can physically hold at most one row per user. The previous
-- surrogate `id` UUID column carried no information that user_id does not
-- already carry, and the previous UNIQUE constraint on user_id is subsumed by
-- the primary key.
--
-- Application code can now rotate keys with a single atomic
-- INSERT ... ON CONFLICT (user_id) DO UPDATE — no separate DELETE, no
-- application-layer invariant, no RLS gap that can cause a unique-violation
-- to leak to the user.
--
-- The dependent row from `local-supabase.e2e-spec.ts` MCP block is unaffected:
-- the e2e suite only reads /settings/mcp and never inserts duplicate keys, so
-- promoting user_id to the PK does not break that path.

alter table public.mcp_api_key drop constraint if exists mcp_api_key_user_id_unique;

alter table public.mcp_api_key
  drop column id,
  add primary key (user_id);
