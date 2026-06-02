-- Add unique constraint on user_id for single-key model
alter table public.mcp_api_key add constraint mcp_api_key_user_id_unique unique (user_id);

-- Remove revoked_at column and index (no longer needed with single key)
alter table public.mcp_api_key drop column if exists revoked_at;
drop index if exists mcp_api_key_active_user_idx;