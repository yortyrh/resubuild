-- Collapse existing rows so each user has at most one key (the single-key model).
-- Keep the most recently used key per user, falling back to the most recently created
-- key for users that have never used their key. This matches the runtime invariant
-- in McpKeyRepository.createKey, which already deletes prior keys before inserting.
delete from public.mcp_api_key k
using (
  select id,
    row_number() over (
      partition by user_id
      order by last_used_at desc nulls last, created_at desc
    ) as rn
  from public.mcp_api_key
) ranked
where k.id = ranked.id
  and ranked.rn > 1;

-- Add unique constraint on user_id for single-key model
alter table public.mcp_api_key add constraint mcp_api_key_user_id_unique unique (user_id);

-- Remove revoked_at column and index (no longer needed with single key)
alter table public.mcp_api_key drop column if exists revoked_at;
drop index if exists mcp_api_key_active_user_idx;
